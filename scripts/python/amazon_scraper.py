from __future__ import annotations

import argparse
import asyncio
import json
import logging
import random
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Iterable
from urllib.parse import urlparse

from bs4 import BeautifulSoup

if TYPE_CHECKING:
    from playwright.async_api import Browser, BrowserContext, Page


LOGGER = logging.getLogger("amazon_scraper")
EPSILON = 0.01


@dataclass
class PriceComparisonResult:
    estado: str | None
    precio_anterior: float | None
    precio_actual: float | None
    cambio_absoluto: float | None
    cambio_percent: float | None


@dataclass
class AmazonProductResult:
    asin: str | None = None
    url: str | None = None
    title: str | None = None
    brand: str | None = None
    price_current: float | None = None
    price_previous: float | None = None
    currency: str | None = None
    discount_percent: int | None = None
    coupon: str | None = None
    prime_price: float | None = None
    deal_detected: bool = False
    deal_type: list[str] = field(default_factory=list)
    availability: str | None = None
    seller: str | None = None
    rating: float | None = None
    review_count: int | None = None
    images: list[str] = field(default_factory=list)
    category: str | None = None
    variants: list[dict[str, Any]] = field(default_factory=list)
    product_condition: str | None = None
    scraped_at: str | None = None
    marketplace: str | None = None
    price_change_vs_previous_run: str | None = None
    canonical_url: str | None = None
    extraction_warnings: list[str] = field(default_factory=list)
    http_status: int | None = None
    page_not_found: bool = False
    is_amazon_sold: bool | None = None
    is_amazon_choice: bool | None = None
    is_amazon_link: bool | None = None

    def to_output_dict(self) -> dict[str, Any]:
        return {
            "asin": self.asin,
            "url": self.canonical_url or self.url,
            "title": self.title,
            "brand": self.brand,
            "price_current": self.price_current,
            "price_previous": self.price_previous,
            "currency": self.currency or "",
            "discount_percent": self.discount_percent,
            "coupon": self.coupon,
            "prime_price": self.prime_price,
            "deal_detected": self.deal_detected,
            "deal_type": self.deal_type,
            "availability": self.availability or "",
            "seller": self.seller or "",
            "rating": self.rating,
            "review_count": self.review_count,
            "images": self.images,
            "variants": self.variants,
            "scraped_at": self.scraped_at,
            "marketplace": self.marketplace or "",
            "price_change_vs_previous_run": self.price_change_vs_previous_run,
            "product_condition": self.product_condition,
            "canonical_url": self.canonical_url,
            "extraction_warnings": self.extraction_warnings,
            "http_status": self.http_status,
            "page_not_found": self.page_not_found,
            "is_amazon_sold": self.is_amazon_sold,
            "is_amazon_choice": self.is_amazon_choice,
            "is_amazon_link": self.is_amazon_link,
        }


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()


def detect_marketplace(url: str | None) -> str | None:
    if not url:
        return None
    host = urlparse(url).netloc.lower()
    host = host.replace("www.", "")
    if "amazon." not in host:
        return None
    return host


def default_currency_for_marketplace(marketplace: str | None) -> str | None:
    if not marketplace:
        return None
    if marketplace.endswith(".es") or marketplace.endswith(".de") or marketplace.endswith(".fr") or marketplace.endswith(".it"):
        return "EUR"
    if marketplace.endswith(".com"):
        return "USD"
    if marketplace.endswith(".co.uk"):
        return "GBP"
    return None


def extract_asin_from_url(url: str | None) -> str | None:
    if not url:
        return None
    m = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", url, re.IGNORECASE)
    return m.group(1).upper() if m else None


def parse_number(value: str | None) -> float | None:
    if value is None:
        return None
    raw = normalize_text(value)
    if not raw:
        return None
    cleaned = re.sub(r"[^\d,.\-]", "", raw)
    if not cleaned:
        return None

    has_comma = "," in cleaned
    has_dot = "." in cleaned
    normalized = cleaned

    if has_comma and has_dot:
        if cleaned.rfind(",") > cleaned.rfind("."):
            normalized = cleaned.replace(".", "").replace(",", ".")
        else:
            normalized = cleaned.replace(",", "")
    elif has_comma:
        normalized = cleaned.replace(",", ".") if re.search(r",\d{1,2}$", cleaned) else cleaned.replace(",", "")
    elif has_dot:
        normalized = cleaned if re.search(r"\.\d{1,2}$", cleaned) else cleaned.replace(".", "")

    try:
        parsed = float(normalized)
    except ValueError:
        return None
    if parsed <= 0 or parsed > 1_000_000:
        return None
    return round(parsed, 2)


def detect_currency(text: str | None) -> str | None:
    t = normalize_text(text).lower()
    if not t:
        return None
    if "â‚¬" in t or "eur" in t:
        return "EUR"
    if "$" in t or "usd" in t:
        return "USD"
    if "Â£" in t or "gbp" in t:
        return "GBP"
    return None


def parse_price_and_currency(value: str | None) -> tuple[float | None, str | None]:
    return parse_number(value), detect_currency(value)


def first_match(patterns: Iterable[re.Pattern[str]], text: str) -> str | None:
    for pattern in patterns:
        m = pattern.search(text)
        if m:
            return m.group(1)
    return None


def safe_json_loads(raw: str) -> Any | None:
    try:
        return json.loads(raw)
    except Exception:
        return None


def compare_price_with_history(
    current_price: float | None,
    previous_price: float | None,
    current_deal_detected: bool,
    previous_deal_detected: bool | None = None,
) -> PriceComparisonResult:
    if current_price is None or previous_price is None:
        return PriceComparisonResult(
            estado=None,
            precio_anterior=previous_price,
            precio_actual=current_price,
            cambio_absoluto=None,
            cambio_percent=None,
        )

    delta = round(current_price - previous_price, 2)
    pct = round((delta / previous_price) * 100, 2) if previous_price else None

    if previous_deal_detected is False and current_deal_detected:
        status = "nueva_oferta"
    elif abs(delta) < EPSILON:
        status = "sin_cambio"
    elif delta < 0:
        status = "bajada"
    else:
        status = "subida"

    return PriceComparisonResult(
        estado=status,
        precio_anterior=previous_price,
        precio_actual=current_price,
        cambio_absoluto=delta,
        cambio_percent=pct,
    )


def is_blocked_or_captcha(html: str) -> bool:
    return bool(
        re.search(
            r"captcha|robot check|automated access|enter the characters you see|validatecaptcha|api-services-support@amazon",
            html,
            re.IGNORECASE,
        )
    )


def is_not_found_page(html: str, status: int | None) -> bool:
    if status == 404:
        return True
    text = normalize_text(html).lower()
    signals = [
        "we couldn't find that page",
        "sorry, we just need to make sure you're not a robot",
        "looking for something?",
        "dogs of amazon",
        "no se ha encontrado la pÃ¡gina",
        "producto no encontrado",
    ]
    return any(s in text for s in signals)


def normalize_availability(raw: str) -> str:
    txt = normalize_text(raw).lower()
    if not txt:
        return "desconocido"
    if re.search(r"currently unavailable|actualmente no disponible|no disponible", txt):
        return "no_disponible"
    if re.search(r"temporarily out of stock|temporalmente sin stock|sin stock", txt):
        return "temporalmente_sin_stock"
    if re.search(r"only \d+ left|solo quedan|pocas unidades|Ãºltimas unidades", txt):
        return "pocas_unidades"
    if re.search(r"pre-order|preventa|reservar", txt):
        return "preventa"
    if re.search(r"in stock|en stock|disponible|aÃ±adir a la cesta|add to cart|comprar ya", txt):
        return "en_stock"
    return "desconocido"


def unique_keep_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        out.append(value)
    return out


def canonicalize_amazon_image_url(url: str) -> str:
    clean = normalize_text(url)
    if not clean:
        return clean
    clean = clean.split("?")[0]
    clean = re.sub(r"(\.jpg|\.jpeg|\.png|\.webp)\..*$", r"\1", clean, flags=re.IGNORECASE)
    clean = re.sub(r"\._[A-Z0-9_,]+\_\.(jpg|jpeg|png|webp)$", r".\1", clean, flags=re.IGNORECASE)
    return clean


def image_identity_key(url: str) -> str:
    base = canonicalize_amazon_image_url(url)
    m = re.search(r"/images/I/([^/]+)\.(?:jpg|jpeg|png|webp)$", base, re.IGNORECASE)
    return m.group(1) if m else base


class AmazonHTMLParser:
    def __init__(self, html: str, source_url: str | None = None, http_status: int | None = None) -> None:
        self.html = html
        self.url = source_url
        self.status = http_status
        self.soup = BeautifulSoup(html, "html.parser")

    def parse(self) -> AmazonProductResult:
        result = AmazonProductResult()
        result.url = self.url
        result.marketplace = detect_marketplace(self.url)
        result.http_status = self.status
        result.scraped_at = datetime.now(timezone.utc).isoformat()
        result.is_amazon_link = bool(result.marketplace and result.marketplace.startswith("amazon."))

        result.canonical_url = self._extract_canonical_url()
        if result.canonical_url:
            result.marketplace = detect_marketplace(result.canonical_url) or result.marketplace
            result.is_amazon_link = bool(result.marketplace and result.marketplace.startswith("amazon."))

        result.asin = (
            extract_asin_from_url(result.canonical_url)
            or extract_asin_from_url(self.url)
            or self._extract_asin_from_dom()
        )
        result.page_not_found = is_not_found_page(self.html, self.status)
        if result.page_not_found:
            result.availability = "producto_no_encontrado"
            result.extraction_warnings.append("PÃ¡gina no encontrada o producto retirado.")
            return result

        result.title = self._extract_title()
        result.brand = self._extract_brand()
        result.price_current, current_currency = self._extract_current_price()
        result.price_previous, previous_currency = self._extract_previous_price()
        result.currency = current_currency or previous_currency or default_currency_for_marketplace(result.marketplace)
        result.prime_price = self._extract_prime_price()
        result.coupon = self._extract_coupon()
        result.availability = self._extract_availability()
        result.product_condition = self._extract_product_condition()
        result.seller = self._extract_seller()
        result.is_amazon_sold = self._is_amazon_sold_offer(result.seller)
        result.is_amazon_choice = self._is_amazon_choice_offer()
        result.rating = self._extract_rating()
        result.review_count = self._extract_review_count()
        result.images = self._extract_images()
        result.category = self._extract_category()
        result.variants = self._extract_variants()

        if (
            result.price_current is not None
            and result.price_previous is not None
            and result.price_previous > result.price_current
        ):
            result.discount_percent = round((1 - (result.price_current / result.price_previous)) * 100)
        else:
            result.discount_percent = None

        result.deal_detected, result.deal_type = self._detect_deals(
            price_current=result.price_current,
            price_previous=result.price_previous,
            coupon=result.coupon,
            prime_price=result.prime_price,
        )

        # Strict mode (adjusted): trust offer fields when sold by Amazon OR Amazon Choice OR Amazon link.
        trusted_offer_source = (
            result.is_amazon_sold is True
            or result.is_amazon_choice is True
            or result.is_amazon_link is True
        )
        if not trusted_offer_source:
            result.price_previous = None
            result.discount_percent = None
            result.coupon = None
            result.deal_detected = False
            result.deal_type = []
            result.extraction_warnings.append(
                "Oferta ignorada: fuente no confiable (no Amazon, ni Opcion Amazon, ni vendido por Amazon)."
            )

        self._validate_result(result)
        return result

    def _extract_canonical_url(self) -> str | None:
        canonical = self.soup.select_one('link[rel="canonical"]')
        if canonical and canonical.has_attr("href"):
            return normalize_text(canonical["href"])
        return None

    def _extract_asin_from_dom(self) -> str | None:
        selectors = [
            "#ASIN",
            'input[name="ASIN"]',
            "#attach-baseAsin",
        ]
        for sel in selectors:
            node = self.soup.select_one(sel)
            if node and node.has_attr("value"):
                value = normalize_text(node["value"]).upper()
                if re.fullmatch(r"[A-Z0-9]{10}", value):
                    return value
        asin_match = re.search(r'"asin"\s*:\s*"([A-Z0-9]{10})"', self.html, re.IGNORECASE)
        if asin_match:
            return asin_match.group(1).upper()
        return None

    def _extract_title(self) -> str | None:
        for sel in ["#productTitle", "#title span", 'meta[name="title"]']:
            node = self.soup.select_one(sel)
            if not node:
                continue
            text = node.get("content") if node.name == "meta" else node.get_text(" ", strip=True)
            text = normalize_text(text)
            if text:
                return text
        return None

    def _extract_brand(self) -> str | None:
        node = self.soup.select_one("#bylineInfo")
        if node:
            txt = normalize_text(node.get_text(" ", strip=True))
            txt = re.sub(r"^(Marca:|Visita la tienda de|Brand:)\s*", "", txt, flags=re.IGNORECASE)
            if txt:
                return txt
        brand_regex = re.search(r'"brand"\s*:\s*"([^"]+)"', self.html, re.IGNORECASE)
        if brand_regex:
            return normalize_text(brand_regex.group(1))
        return None

    def _extract_current_price(self) -> tuple[float | None, str | None]:
        selectors = [
            "#corePrice_feature_div .a-price .a-offscreen",
            "#apex_desktop .a-price .a-offscreen",
            ".apexPriceToPay .a-offscreen",
            "#priceblock_dealprice",
            "#priceblock_ourprice",
            "#price_inside_buybox",
            ".a-price.aok-align-center .a-offscreen",
        ]
        for sel in selectors:
            node = self.soup.select_one(sel)
            if node:
                price, currency = parse_price_and_currency(node.get_text(" ", strip=True))
                if price is not None:
                    return price, currency

        patterns = [
            re.compile(r'"priceToPay"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.,]+)', re.IGNORECASE),
            re.compile(r'"priceAmount"\s*:\s*([\d.,]+)', re.IGNORECASE),
            re.compile(r'"price"\s*:\s*"([\d.,]+)"', re.IGNORECASE),
        ]
        raw = first_match(patterns, self.html)
        if raw:
            return parse_price(raw), detect_currency(raw)
        return None, None

    def _extract_previous_price(self) -> tuple[float | None, str | None]:
        if not self._has_real_savings_signal():
            return None, None

        selectors = [
            "#corePrice_feature_div span.a-price.a-text-price .a-offscreen",
            "#corePrice_feature_div .basisPrice .a-offscreen",
            "#apex_desktop span.a-price.a-text-price .a-offscreen",
            ".basisPrice .a-offscreen",
            ".reinventPriceSavingsPercentageMargin .a-offscreen",
            "span.a-price.a-text-price .a-offscreen",
            '[data-a-strike="true"] .a-offscreen',
        ]
        for sel in selectors:
            node = self.soup.select_one(sel)
            if node:
                price, currency = parse_price_and_currency(node.get_text(" ", strip=True))
                if price is not None:
                    return price, currency

        patterns = [
            re.compile(r'"wasPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.,]+)', re.IGNORECASE),
            re.compile(r'"strikethroughPrice"\s*:\s*\{[^}]*"amount"\s*:\s*([\d.,]+)', re.IGNORECASE),
        ]
        raw = first_match(patterns, self.html)
        if raw:
            return parse_price(raw), detect_currency(raw)
        return None, None

    def _extract_coupon(self) -> str | None:
        selectors = [
            "#couponTextpctch",
            "#couponBadgeText",
            "#voucherText",
            '[data-cy="coupon"]',
        ]
        for sel in selectors:
            node = self.soup.select_one(sel)
            if node:
                text = normalize_text(node.get_text(" ", strip=True))
                if text:
                    return text

        m = re.search(
            r"(cup[oÃ³]n[^<\n]{0,80}|ahorra[^<\n]{0,80}|save\s+\d+%[^<\n]{0,50})",
            self.html,
            re.IGNORECASE,
        )
        return normalize_text(m.group(1)) if m else None

    def _extract_prime_price(self) -> float | None:
        selectors = [
            "#pep-signup-link + span .a-price .a-offscreen",
            "#primeExclusivePrice_feature_div .a-offscreen",
            ".prime-price .a-offscreen",
        ]
        for sel in selectors:
            node = self.soup.select_one(sel)
            if node:
                value = parse_number(node.get_text(" ", strip=True))
                if value is not None:
                    return value

        m = re.search(r"precio\s+prime[^0-9]{0,20}([\d.,]+\s*[â‚¬$Â£])", self.html, re.IGNORECASE)
        return parse_number(m.group(1)) if m else None

    def _extract_availability(self) -> str:
        selectors = [
            "#availability",
            "#availabilityInsideBuyBox_feature_div",
            "#deliveryBlockMessage",
            "#outOfStock",
        ]
        for sel in selectors:
            node = self.soup.select_one(sel)
            if node:
                return normalize_availability(node.get_text(" ", strip=True))

        ld_availability = re.search(r'"availability"\s*:\s*"([^"]+)"', self.html, re.IGNORECASE)
        if ld_availability:
            return normalize_availability(ld_availability.group(1))
        return "desconocido"

    def _extract_product_condition(self) -> str | None:
        selectors = [
            "#newAccordionRow_0 .accordion-header",
            "#condition",
            "#usedBuyBox",
        ]
        joined = " ".join(
            normalize_text((node.get_text(" ", strip=True) if node else ""))
            for node in [self.soup.select_one(sel) for sel in selectors]
        ).lower()
        if "reacondicionado" in joined:
            return "reacondicionado"
        if "usado" in joined or "used" in joined:
            return "usado"
        if "nuevo" in joined or "new" in joined:
            return "nuevo"
        return None

    def _extract_seller(self) -> str | None:
        selectors = [
            "#sellerProfileTriggerId",
            "#merchant-info",
            "#fulfillerInfoFeature_feature_div",
        ]
        for sel in selectors:
            node = self.soup.select_one(sel)
            if not node:
                continue
            text = normalize_text(node.get_text(" ", strip=True))
            if text:
                return text
        return None

    def _is_amazon_sold_offer(self, seller_text: str | None) -> bool:
        text = normalize_text(seller_text).lower()
        if not text:
            # No asumimos Amazon si no hay señal clara.
            return False
        if re.search(r"(sold by|vendido por)\s+amazon", text):
            return True
        if re.search(r"\bamazon warehouse\b|\bamazon segunda mano\b", text):
            return True
        if re.search(r"opci[oó]n amazon", text):
            return True
        if "vendido por" in text and "amazon" not in text:
            return False
        return bool(re.search(r"\bamazon(\.[a-z]{2,3})?\b", text))

    def _is_amazon_choice_offer(self) -> bool:
        selectors = [
            "#acBadge_feature_div",
            "#acBadge",
            '[data-csa-c-content-id*="acBadge"]',
            '[aria-label*="Opción Amazon"]',
        ]
        for sel in selectors:
            node = self.soup.select_one(sel)
            if node and re.search(r"opci[oó]n\s+amazon|amazon'?s?\s+choice", node.get_text(" ", strip=True), re.IGNORECASE):
                return True
        # fallback text scan near buybox
        text = self._extract_buybox_text().lower()
        return bool(re.search(r"opci[oó]n amazon|amazon'?s choice", text))

    def _extract_rating(self) -> float | None:
        selectors = ['span[data-hook="rating-out-of-text"]', "#acrPopover"]
        for sel in selectors:
            node = self.soup.select_one(sel)
            if not node:
                continue
            raw = normalize_text(node.get("title") or node.get_text(" ", strip=True))
            m = re.search(r"([\d.,]+)\s*(?:de|out of)\s*5", raw, re.IGNORECASE)
            if m:
                val = parse_number(m.group(1))
                if val is not None:
                    return val
        return None

    def _extract_review_count(self) -> int | None:
        node = self.soup.select_one("#acrCustomerReviewText")
        if node:
            m = re.search(r"([\d\.,]+)", node.get_text(" ", strip=True))
            if m:
                n = int(re.sub(r"[^\d]", "", m.group(1)))
                return n if n > 0 else None
        m = re.search(r'"reviewCount"\s*:\s*"?(\\?\d[\d.,]*)"?', self.html, re.IGNORECASE)
        if m:
            n = int(re.sub(r"[^\d]", "", m.group(1)))
            return n if n > 0 else None
        return None

    def _extract_images(self) -> list[str]:
        images: list[str] = []

        landing = self.soup.select_one("#landingImage")
        if landing:
            dyn = landing.get("data-a-dynamic-image")
            if dyn:
                dyn_json = safe_json_loads(dyn)
                if isinstance(dyn_json, dict):
                    images.extend([normalize_text(url) for url in dyn_json.keys()])
            src = landing.get("src")
            if src:
                images.append(normalize_text(src))

        for attr in ["data-old-hires", "data-a-dynamic-image", "data-zoom-image"]:
            for node in self.soup.select(f"[{attr}]"):
                value = node.get(attr)
                if not value:
                    continue
                if attr == "data-a-dynamic-image":
                    maybe_json = safe_json_loads(value)
                    if isinstance(maybe_json, dict):
                        images.extend([normalize_text(url) for url in maybe_json.keys()])
                else:
                    images.append(normalize_text(value))

        filtered: list[str] = []
        for raw_url in images:
            if not raw_url.startswith("http"):
                continue
            c = canonicalize_amazon_image_url(raw_url)
            # Keep only likely product image hosts/paths, discard sprites/js/gifs.
            if not re.search(r"amazon\.(com|es|co\.uk|de|fr|it|nl|pl|se|com\.mx)", c, re.IGNORECASE):
                continue
            if not re.search(r"/images/I/", c):
                continue
            if not re.search(r"\.(jpg|jpeg|png|webp)$", c, re.IGNORECASE):
                continue
            filtered.append(c)
        by_identity: dict[str, str] = {}
        for url in filtered:
            key = image_identity_key(url)
            canonical = url
            if key not in by_identity:
                by_identity[key] = canonical

        # Keep only first unique "main" images; avoid hundreds of size variants.
        return list(by_identity.values())[:20]

    def _extract_category(self) -> str | None:
        breadcrumb = self.soup.select("#wayfinding-breadcrumbs_feature_div ul li a")
        cats = [normalize_text(node.get_text(" ", strip=True)) for node in breadcrumb]
        cats = [c for c in cats if c]
        return " > ".join(cats) if cats else None

    def _extract_variants(self) -> list[dict[str, Any]]:
        variants: list[dict[str, Any]] = []
        dim_aliases = {
            "size_name": "Tamano",
            "Tamaño": "Tamano",
            "style_name": "Nombre de estilo",
            "color_name": "Color",
        }

        variant_blocks = self.soup.select('div[id^="variation_"], div[id*="twister"]')
        for block in variant_blocks:
            header = block.select_one(".a-form-label")
            dim = normalize_text(header.get_text(" ", strip=True)) if header else None
            if not dim:
                continue
            options: list[dict[str, Any]] = []
            for opt in block.select("li, span.a-button-text"):
                raw_label = (
                    opt.get("title")
                    or opt.get("aria-label")
                    or normalize_text(opt.get_text(" ", strip=True))
                )
                label = normalize_text(raw_label)
                if not label or len(label) > 100:
                    continue
                status = "disponible"
                joined = (opt.get("class") or []) if isinstance(opt.get("class"), list) else []
                if any("unavailable" in c or "disabled" in c for c in joined):
                    status = "no_disponible"
                options.append({"value": label, "status": status})
            if options:
                variants.append({"dimension": dim, "options": unique_keep_order_json(options)})

        # Inline twister DOM (common in current Amazon layout)
        inline_rows = self.soup.select('div[id^="inline-twister-row-"]')
        for row in inline_rows:
            row_id = row.get("id", "")
            dim_key = row_id.replace("inline-twister-row-", "")
            title_node = row.select_one(f'#inline-twister-dim-title-{dim_key} .a-color-secondary')
            dim_name = normalize_text(title_node.get_text(" ", strip=True)).replace(":", "") if title_node else dim_key
            options: list[dict[str, Any]] = []
            for li in row.select("li[data-asin]"):
                asin = normalize_text(li.get("data-asin"))
                label_node = li.select_one(".swatch-title-text-display, .swatch-title-text")
                label = normalize_text(label_node.get_text(" ", strip=True)) if label_node else None
                if not label:
                    continue
                unavailable = li.get("data-initiallyUnavailable") == "true"
                options.append(
                    {
                        "value": label,
                        "asin": asin if asin else None,
                        "status": "no_disponible" if unavailable else "disponible",
                    }
                )
            if options:
                variants.append({"dimension": dim_name, "options": unique_keep_order_json(options)})

        # JSON state for twister variants (very robust on modern Amazon pages)
        for script in self.soup.select('script[type="a-state"][data-a-state]'):
            state_meta = script.get("data-a-state")
            if not state_meta:
                continue
            state_json = safe_json_loads(state_meta)
            if not isinstance(state_json, dict):
                continue
            if state_json.get("key") != "desktop-twister-sort-filter-data":
                continue

            payload = safe_json_loads(script.get_text(strip=True))
            if not isinstance(payload, dict):
                continue

            sorted_all = payload.get("sortedDimValuesForAllDims")
            if not isinstance(sorted_all, dict):
                continue

            for dim_key, dim_values in sorted_all.items():
                if not isinstance(dim_values, list):
                    continue
                options: list[dict[str, Any]] = []
                for item in dim_values:
                    if not isinstance(item, dict):
                        continue
                    label = normalize_text(str(item.get("dimensionValueDisplayText", "")))
                    asin = normalize_text(str(item.get("defaultAsin", "")))
                    state = normalize_text(str(item.get("dimensionValueState", ""))).upper()
                    if not label:
                        continue
                    status = "disponible" if state in {"AVAILABLE", "SELECTED"} else "no_disponible"
                    options.append({"value": label, "asin": asin or None, "status": status})
                if options:
                    variants.append({"dimension": dim_aliases.get(dim_key, dim_key), "options": unique_keep_order_json(options)})

        dim_map_match = re.search(r'"dimensionToAsinMap"\s*:\s*(\{.*?\})\s*,\s*"dimensionsDisplay"', self.html, re.DOTALL)
        if dim_map_match:
            dim_map = safe_json_loads(dim_map_match.group(1))
            if isinstance(dim_map, dict):
                variants.append(
                    {
                        "dimension": "asin_map",
                        "options": [
                            {"value": key, "asin": value}
                            for key, value in dim_map.items()
                            if isinstance(key, str) and isinstance(value, str)
                        ],
                    }
                )

        merged_by_dim: dict[str, list[dict[str, Any]]] = {}
        for block in variants:
            dim = normalize_text(str(block.get("dimension", "")))
            opts = block.get("options")
            if not dim or not isinstance(opts, list):
                continue
            dim = dim_aliases.get(dim, dim)
            merged_by_dim.setdefault(dim, [])
            merged_by_dim[dim].extend([o for o in opts if isinstance(o, dict)])

        merged: list[dict[str, Any]] = []
        for dim, opts in merged_by_dim.items():
            dedup_by_key: dict[str, dict[str, Any]] = {}
            for option in opts:
                key = f"{option.get('value','')}|{option.get('asin','')}"
                existing = dedup_by_key.get(key)
                if existing is None:
                    dedup_by_key[key] = option
                    continue
                # If conflicting status exists, keep the strict one.
                if existing.get("status") != "no_disponible" and option.get("status") == "no_disponible":
                    dedup_by_key[key] = option
            merged.append({"dimension": dim, "options": list(dedup_by_key.values())})
        return merged

    def _detect_deals(
        self,
        price_current: float | None,
        price_previous: float | None,
        coupon: str | None,
        prime_price: float | None,
    ) -> tuple[bool, list[str]]:
        deal_types: list[str] = []
        buybox_text = self._extract_buybox_text().lower()

        visible_patterns = [
            "deal",
            "oferta",
            "ahorra",
            "limited time deal",
            "prime day",
            "oferta flash",
            "prime deal",
        ]
        if any(p in buybox_text for p in visible_patterns):
            deal_types.append("oferta_visible")

        if (
            price_current is not None
            and price_previous is not None
            and price_previous > price_current
        ):
            deal_types.append("descuento_calculado")

        if coupon:
            deal_types.append("cupon_adicional")

        if prime_price is not None and price_current is not None and prime_price < price_current:
            deal_types.append("precio_prime")

        return len(deal_types) > 0, unique_keep_order(deal_types)

    def _extract_buybox_text(self) -> str:
        selectors = [
            "#corePrice_feature_div",
            "#apex_desktop",
            "#desktop_buybox",
            "#buybox",
            "#newAccordionRow_0",
            "#dealBadge_feature_div",
            "#voucherText",
            "#couponTextpctch",
        ]
        chunks: list[str] = []
        for sel in selectors:
            node = self.soup.select_one(sel)
            if node:
                chunks.append(normalize_text(node.get_text(" ", strip=True)))
        if not chunks:
            return ""
        return " ".join(chunks)

    def _has_real_savings_signal(self) -> bool:
        selectors = [
            "#corePrice_feature_div .savingsPercentage",
            "#corePrice_feature_div .reinventPriceSavingsPercentageMargin",
            "#corePrice_feature_div #dealBadge_feature_div",
            "#corePrice_feature_div [id*='savings']",
            "#apex_desktop .savingsPercentage",
        ]
        for sel in selectors:
            if self.soup.select_one(sel):
                return True
        text = self._extract_buybox_text().lower()
        return bool(re.search(r"\bahorra\b|-\s?\d{1,2}\s?%", text))

    def _validate_result(self, result: AmazonProductResult) -> None:
        if not result.asin:
            result.extraction_warnings.append("No se pudo extraer ASIN.")
        if not result.title:
            result.extraction_warnings.append("No se pudo extraer titulo.")
        if result.price_current is None:
            result.extraction_warnings.append("No se pudo extraer precio actual.")
        if result.price_previous is not None and result.price_current is not None:
            if result.price_previous <= result.price_current:
                result.extraction_warnings.append(
                    "Precio anterior no es mayor que precio actual; se conserva pero no cuenta como descuento real."
                )


def unique_keep_order_json(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    encoded_seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for item in items:
        key = json.dumps(item, ensure_ascii=False, sort_keys=True)
        if key in encoded_seen:
            continue
        encoded_seen.add(key)
        out.append(item)
    return out


class AmazonPlaywrightClient:
    def __init__(
        self,
        timeout_ms: int = 30_000,
        max_retries: int = 3,
        backoff_base_seconds: float = 1.5,
        headless: bool = True,
        browser_channel: str | None = "chrome",
    ) -> None:
        self.timeout_ms = timeout_ms
        self.max_retries = max_retries
        self.backoff_base_seconds = backoff_base_seconds
        self.headless = headless
        self.browser_channel = browser_channel
        self._pw = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None

    async def __aenter__(self) -> "AmazonPlaywrightClient":
        try:
            from playwright.async_api import async_playwright
        except ImportError as exc:
            raise RuntimeError(
                "Playwright no estÃ¡ instalado en Python. Instala dependencias de requirements-amazon-scraper.txt."
            ) from exc

        self._pw = await async_playwright().start()
        launch_args = {
            "headless": self.headless,
            "args": ["--disable-blink-features=AutomationControlled"],
        }
        try:
            if self.browser_channel:
                self._browser = await self._pw.chromium.launch(channel=self.browser_channel, **launch_args)
            else:
                self._browser = await self._pw.chromium.launch(**launch_args)
        except Exception as exc:
            message = str(exc)
            if self.browser_channel and "Executable doesn't exist" in message:
                LOGGER.warning(
                    "No se pudo lanzar canal '%s'. Reintentando con Chromium gestionado por Playwright.",
                    self.browser_channel,
                )
                self._browser = await self._pw.chromium.launch(**launch_args)
            else:
                raise
        self._context = await self._browser.new_context(
            locale="es-ES",
            viewport={"width": 1366, "height": 768},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()

    async def fetch(self, url: str) -> tuple[str, str, int | None]:
        if not self._context:
            raise RuntimeError("Cliente Playwright no inicializado.")

        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            page: Page | None = None
            try:
                page = await self._context.new_page()
                await page.route("**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,mp4,webm}", lambda r: r.abort())
                response = await page.goto(url, wait_until="domcontentloaded", timeout=self.timeout_ms)
                await page.wait_for_timeout(1200)
                for selector in ["#dp", "#productTitle", "body"]:
                    try:
                        await page.wait_for_selector(selector, timeout=3000)
                        break
                    except Exception:
                        continue
                html = await page.content()
                final_url = page.url
                status = response.status if response else None
                if is_blocked_or_captcha(html):
                    raise RuntimeError("Bloqueo/CAPTCHA detectado.")
                return html, final_url, status
            except Exception as exc:
                last_error = exc if isinstance(exc, Exception) else RuntimeError(str(exc))
                if attempt >= self.max_retries:
                    break
                wait_time = self.backoff_base_seconds * (2 ** (attempt - 1)) + random.uniform(0.1, 0.7)
                LOGGER.warning(
                    "Fallo de carga intento %s/%s (%s). Reintento en %.2fs",
                    attempt,
                    self.max_retries,
                    str(last_error),
                    wait_time,
                )
                await asyncio.sleep(wait_time)
            finally:
                if page:
                    await page.close()

        raise RuntimeError(f"No se pudo cargar URL tras reintentos: {url}. Error: {last_error}")


async def scrape_amazon_product(
    url: str,
    previous_price: float | None = None,
    previous_deal_detected: bool | None = None,
    timeout_ms: int = 30_000,
    max_retries: int = 3,
    headless: bool = True,
    browser_channel: str | None = "chrome",
) -> AmazonProductResult:
    async with AmazonPlaywrightClient(
        timeout_ms=timeout_ms,
        max_retries=max_retries,
        headless=headless,
        browser_channel=browser_channel,
    ) as client:
        html, final_url, status = await client.fetch(url)

    parser = AmazonHTMLParser(html=html, source_url=final_url, http_status=status)
    result = parser.parse()

    comparison = compare_price_with_history(
        current_price=result.price_current,
        previous_price=previous_price,
        current_deal_detected=result.deal_detected,
        previous_deal_detected=previous_deal_detected,
    )
    result.price_change_vs_previous_run = comparison.estado
    if comparison.estado == "bajada":
        result.deal_type = unique_keep_order(result.deal_type + ["bajada_historica"])
        result.deal_detected = True
    return result


def parse_html_file_for_debug(
    html_file: str,
    source_url: str | None = None,
    previous_price: float | None = None,
    previous_deal_detected: bool | None = None,
) -> AmazonProductResult:
    with open(html_file, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()
    parser = AmazonHTMLParser(html=html, source_url=source_url)
    result = parser.parse()
    comparison = compare_price_with_history(
        current_price=result.price_current,
        previous_price=previous_price,
        current_deal_detected=result.deal_detected,
        previous_deal_detected=previous_deal_detected,
    )
    result.price_change_vs_previous_run = comparison.estado
    if comparison.estado == "bajada":
        result.deal_type = unique_keep_order(result.deal_type + ["bajada_historica"])
        result.deal_detected = True
    return result


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scraper robusto de Amazon (Playwright + parser HTML).")
    parser.add_argument("--url", help="URL del producto Amazon.", default=None)
    parser.add_argument("--html-file", help="Ruta a HTML local para pruebas offline.", default=None)
    parser.add_argument("--source-url", help="URL de referencia para HTML local.", default=None)
    parser.add_argument("--previous-price", type=float, default=None, help="Precio previo para comparaciÃ³n histÃ³rica.")
    parser.add_argument(
        "--previous-deal-detected",
        choices=["true", "false"],
        default=None,
        help="Estado de oferta de la ejecuciÃ³n anterior.",
    )
    parser.add_argument("--timeout-ms", type=int, default=30_000)
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument("--headed", action="store_true", help="Ejecuta navegador visible (headless=False).")
    parser.add_argument(
        "--browser-channel",
        default="chrome",
        choices=["chrome", "msedge", "chromium", "none"],
        help="Canal de navegador. 'none' fuerza Chromium de Playwright.",
    )
    parser.add_argument("--output", default=None, help="Ruta a JSON de salida.")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    return parser


async def _async_main(args: argparse.Namespace) -> int:
    previous_deal = None
    if args.previous_deal_detected == "true":
        previous_deal = True
    elif args.previous_deal_detected == "false":
        previous_deal = False

    if args.html_file:
        result = parse_html_file_for_debug(
            html_file=args.html_file,
            source_url=args.source_url,
            previous_price=args.previous_price,
            previous_deal_detected=previous_deal,
        )
    else:
        if not args.url:
            raise SystemExit("Debes pasar --url o --html-file.")
        result = await scrape_amazon_product(
            url=args.url,
            previous_price=args.previous_price,
            previous_deal_detected=previous_deal,
            timeout_ms=args.timeout_ms,
            max_retries=args.max_retries,
            headless=not args.headed,
            browser_channel=None if args.browser_channel == "none" else args.browser_channel,
        )

    payload = result.to_output_dict()
    # Use ASCII-safe JSON for Windows consoles and write directly to stdout buffer.
    # This avoids intermittent UnicodeEncodeError crashes in non-UTF8 terminals.
    serialized = json.dumps(payload, ensure_ascii=True, indent=2)
    sys.stdout.buffer.write(serialized.encode("utf-8", errors="replace"))
    sys.stdout.buffer.write(b"\n")

    if args.output:
        with open(args.output, "w", encoding="utf-8") as out:
            out.write(serialized)
            out.write("\n")
    return 0


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()
    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    return asyncio.run(_async_main(args))


if __name__ == "__main__":
    raise SystemExit(main())
