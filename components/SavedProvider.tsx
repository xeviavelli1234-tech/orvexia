"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SavedCtx {
  savedIds: Set<string>;
  toggle: (productId: string) => Promise<void>;
  loading: boolean;
}

const Ctx = createContext<SavedCtx>({
  savedIds: new Set(),
  toggle: async () => {},
  loading: true,
});

export function SavedProvider({ children }: { children: React.ReactNode }) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/saved-products")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.savedIds) setSavedIds(new Set(d.savedIds));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = useCallback(async (productId: string) => {
    const isSaved = savedIds.has(productId);

    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(productId);
      else next.add(productId);
      return next;
    });

    const res = await fetch("/api/saved-products", {
      method: isSaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    if (res.status === 401) {
      // Revert and redirect
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(productId);
        else next.delete(productId);
        return next;
      });
      window.location.href = "/login";
      return;
    }

    if (!res.ok) {
      // Revert on error
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(productId);
        else next.delete(productId);
        return next;
      });
    } else {
      window.dispatchEvent(new CustomEvent("orvexia:data-changed"));
    }
  }, [savedIds]);

  return <Ctx.Provider value={{ savedIds, toggle, loading }}>{children}</Ctx.Provider>;
}

export function useSaved() {
  return useContext(Ctx);
}
