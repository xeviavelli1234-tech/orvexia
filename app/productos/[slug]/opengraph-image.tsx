/**
 * Imagen OG dinámica por producto.
 *
 * Cada producto tiene su propia preview 1200×630 al compartirlo en
 * WhatsApp, Twitter, LinkedIn, etc. Antes era genérica (logo Orvexia);
 * ahora muestra el nombre, marca, mejor precio y mejor descuento.
 *
 * Next la sirve en /productos/[slug]/opengraph-image. ImageResponse
 * compila el JSX a PNG en el edge — sin headless browser.
 */

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Producto en Orvexia";

export default async function OpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      brand: true,
      category: true,
      rating: true,
      reviewCount: true,
      offers: {
        where: { inStock: true, priceCurrent: { gt: 0 } },
        orderBy: { priceCurrent: "asc" },
        select: { priceCurrent: true, discountPercent: true, store: true },
        take: 1,
      },
    },
  });

  // Fallback si no hay producto — devolvemos una OG genérica de Orvexia
  // en lugar de un 404, para que el enlace mantenga preview decente.
  const name = product?.name ?? "Orvexia";
  const brand = product?.brand ?? "";
  const offer = product?.offers[0];
  const price = offer ? `${offer.priceCurrent.toFixed(2)} €` : null;
  const discount =
    offer?.discountPercent && offer.discountPercent > 0
      ? `-${offer.discountPercent}%`
      : null;
  const rating = product?.rating
    ? product.rating.toFixed(1)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #050913 0%, #0a0d24 50%, #10173a 100%)",
          color: "white",
          padding: 80,
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Halo cyan/violeta de fondo */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(34,211,238,0.18), transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(168,85,247,0.18), transparent 65%)",
          }}
        />

        {/* Brand + tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 22,
            color: "#67e8f9",
            letterSpacing: 4,
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#22d3ee",
              boxShadow: "0 0 14px #22d3ee",
            }}
          />
          ▸ orvexia · {brand.toUpperCase()}
        </div>

        {/* Nombre del producto */}
        <div
          style={{
            marginTop: 36,
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            maxWidth: 1000,
            display: "flex",
          }}
        >
          {name}
        </div>

        {/* Precio + descuento */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          {price ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 18,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  fontFamily: "monospace",
                }}
              >
                desde
              </div>
              <div
                style={{
                  fontSize: 110,
                  fontWeight: 900,
                  color: "#5eead4",
                  letterSpacing: -3,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 24,
                }}
              >
                {price}
                {discount && (
                  <span
                    style={{
                      fontSize: 38,
                      color: "#fbbf24",
                      fontWeight: 800,
                      letterSpacing: 0,
                    }}
                  >
                    {discount}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: 28,
                color: "rgba(255,255,255,0.55)",
                display: "flex",
              }}
            >
              Compara precios entre tiendas
            </div>
          )}

          {/* Rating + reviews */}
          {rating && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: "#fbbf24",
                  letterSpacing: -1,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                ★ {rating}
              </div>
              {product?.reviewCount ? (
                <div
                  style={{
                    fontSize: 22,
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 4,
                  }}
                >
                  {product.reviewCount.toLocaleString("es-ES")} reseñas
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
