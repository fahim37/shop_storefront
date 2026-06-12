"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Read/write the catalog filter state from the URL query string (shareable +
 * bookmarkable, per the stack rules). Params used:
 *   brand (brandId), minPrice/maxPrice (in TAKA), rating (1-5), sort.
 */
export function useFilterParams() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = useCallback((key: string) => sp.get(key) ?? "", [sp]);

  const setParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );

  const clearAll = useCallback(() => {
    // Preserve the search query `q` (if any); drop every filter.
    const q = sp.get("q");
    router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname, {
      scroll: false,
    });
  }, [sp, router, pathname]);

  const activeCount = ["brand", "minPrice", "maxPrice", "rating"].filter((k) =>
    sp.get(k),
  ).length;

  return { get, setParams, clearAll, activeCount, sp };
}

/** Convert a TAKA URL value to a paisa string for the API (or undefined). */
export function takaToPaisa(value: string): string | undefined {
  const n = Number(value);
  if (!value || Number.isNaN(n) || n < 0) return undefined;
  return String(Math.round(n) * 100);
}
