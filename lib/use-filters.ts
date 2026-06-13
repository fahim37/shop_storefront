"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Read/write the catalog filter state from the URL query string (shareable +
 * bookmarkable, per the stack rules).
 *
 * Storefront URL params (these are the FRONTEND's own names; the API mapping
 * lives in the api files):
 *   brand     CSV of brand ids        -> brandIds
 *   minPrice  / maxPrice (TAKA)       -> priceMinPaisa / priceMaxPaisa (x100)
 *   rating    "1".."5"                -> rating
 *   instock   "1"                     -> inStock=true
 *   sale      "1"                     -> onSale=true
 *   opt_<Key> CSV                     -> opt[<Key>]
 *   sort                              -> sort
 *   q (search only)                  -> q
 */

/** The non-filter params that must never be cleared / counted as filters. */
const PRESERVED = new Set(["q", "sort", "cursor"]);

/** Split a CSV param value into a trimmed, de-duped, non-empty list. */
export function csvToList(value: string | null | undefined): string[] {
  if (!value) return [];
  const out: string[] = [];
  for (const raw of value.split(",")) {
    const v = raw.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

export function useFilterParams() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const get = useCallback((key: string) => sp.get(key) ?? "", [sp]);

  /** Read a CSV param as an array. */
  const getList = useCallback(
    (key: string) => csvToList(sp.get(key)),
    [sp],
  );

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

  /** Toggle a single value inside a CSV param (add if absent, remove if present). */
  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = csvToList(sp.get(key));
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setParams({ [key]: next.length ? next.join(",") : null });
    },
    [sp, setParams],
  );

  const clearAll = useCallback(() => {
    // Preserve `q` and `sort`; drop every filter (brand, price, rating,
    // instock, sale, every opt_*).
    const next = new URLSearchParams();
    const q = sp.get("q");
    const sort = sp.get("sort");
    if (q) next.set("q", q);
    if (sort) next.set("sort", sort);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [sp, router, pathname]);

  // Count every active selection (per value for CSV params); exclude q/sort/cursor.
  let activeCount = 0;
  for (const [key, value] of sp.entries()) {
    if (PRESERVED.has(key) || !value) continue;
    if (key === "brand" || key.startsWith("opt_")) {
      activeCount += csvToList(value).length;
    } else if (
      key === "minPrice" ||
      key === "maxPrice" ||
      key === "rating" ||
      key === "instock" ||
      key === "sale"
    ) {
      activeCount += 1;
    }
  }

  /**
   * Collect every `opt_<Key>` URL param into { Key: values[] }. The reserved
   * "_"-prefixed hex keys are never written to the URL so nothing to skip here.
   */
  const getOptions = useCallback((): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    for (const [key, value] of sp.entries()) {
      if (!key.startsWith("opt_")) continue;
      const optKey = key.slice("opt_".length);
      if (!optKey) continue;
      const values = csvToList(value);
      if (values.length) out[optKey] = values;
    }
    return out;
  }, [sp]);

  return {
    get,
    getList,
    setParams,
    toggleInList,
    clearAll,
    activeCount,
    getOptions,
    sp,
  };
}

/** Convert a TAKA URL value to a paisa string for the API (or undefined). */
export function takaToPaisa(value: string): string | undefined {
  const n = Number(value);
  if (!value || Number.isNaN(n) || n < 0) return undefined;
  return String(Math.round(n) * 100);
}
