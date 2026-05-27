interface TrackRetailerClickInput {
  productId: string;
  selectedRetailer: string;
  retailerPosition: number;
  isPrimary: boolean;
  pageContext?: string;
  placement?: string;
}

export function trackRetailerClick(payload: TrackRetailerClickInput): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    productId: payload.productId,
    selectedRetailer: payload.selectedRetailer,
    retailerPosition: payload.retailerPosition,
    isPrimary: payload.isPrimary,
    pageContext: payload.pageContext,
    placement: payload.placement,
    timestamp: new Date().toISOString(),
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/affiliate-click", blob);
    return;
  }

  void fetch("/api/affiliate-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
