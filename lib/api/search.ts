"use client";

import {
  useInfiniteQuery,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk, type SearchParams } from "@/lib/api/query-keys";
import { cartSessionHeaders } from "@/lib/cart/cart-session";
import { hasAccessToken } from "@/lib/auth/tokens";
import type {
  AutocompleteItem,
  RecResponse,
  SearchResponse,
} from "@/lib/api/types";

/** Build the bracketed `filters[...]` query the search endpoint expects. */
function searchQuery(params: SearchParams, cursor?: string) {
  return {
    q: params.q,
    sort: params.sort ?? "relevance",
    limit: params.limit ?? 24,
    cursor,
    "filters[categoryId]": params.categoryId,
    "filters[brandId]": params.brandId,
    "filters[priceMinPaisa]": params.priceMinPaisa,
    "filters[priceMaxPaisa]": params.priceMaxPaisa,
    "filters[rating]": params.rating,
  };
}

/** Cursor-paginated semantic/lexical search. */
export function useSearchInfinite(params: SearchParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: qk.search(params),
    initialPageParam: undefined as string | undefined,
    enabled: enabled && params.q.trim().length > 0,
    queryFn: ({ pageParam }) =>
      http.get<SearchResponse>("/search", { params: searchQuery(params, pageParam) }),
    getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
  });
}

/** Lightweight autocomplete (min 2 chars). */
export function useAutocomplete(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: qk.autocomplete(q),
    queryFn: () =>
      http.get<{ items: AutocompleteItem[] }>("/search/autocomplete", {
        params: { q },
      }),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}

/** Fire-and-forget search click analytics. */
export function recordSearchClick(
  searchQueryId: string,
  productId: string,
  position: number,
): void {
  if (!searchQueryId) return; // backend returns "" when logging failed
  void http
    .post("/search/click", { searchQueryId, productId, position })
    .catch(() => {});
}

/** Popular/recommended products for the home page. */
export function useHomeRecommendations(
  options?: Partial<UseQueryOptions<RecResponse>>,
) {
  return useQuery({
    queryKey: qk.recommendationsHome(),
    queryFn: () => http.get<RecResponse>("/me/recommendations/home"),
    staleTime: 2 * 60_000,
    ...options,
  });
}

/** Cart-upsell recommendations (requires auth or a cart session token). */
export function useCartRecommendations(enabled = true) {
  return useQuery({
    queryKey: qk.cartRecommendations(),
    queryFn: () =>
      http.get<RecResponse>("/cart/recommendations", {
        headers: hasAccessToken() ? undefined : cartSessionHeaders(false),
      }),
    enabled,
    staleTime: 60_000,
  });
}
