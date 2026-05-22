/**
 * Fire-and-forget al endpoint de tracking. Pensado para llamarse desde el
 * onClick de un enlace externo: sendBeacon sobrevive a la navegación inmediata
 * (el navegador no cancela la petición al cambiar de página). fetch+keepalive
 * cubre el fallback.
 */
export interface ClickPayload {
  productId: string;
  selectedRetailer: string;
  retailerPosition: number;
  isPrimary: boolean;
  pageContext?: string;
  placement?: string;
}

export function trackAffiliateClick(payload: ClickPayload): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    ...payload,
    pageContext: payload.pageContext ?? window.location.pathname.slice(0, 120),
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    const sent = navigator.sendBeacon("/api/affiliate-click", blob);
    if (sent) return;
  }

  fetch("/api/affiliate-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
