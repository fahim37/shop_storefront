"use client";

import {
  useInfiniteQuery,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk, type SearchParams } from "@/lib/api/query-keys";
import {
  compactParams,
  optionParams,
  unionBrandIds,
} from "@/lib/api/filter-params";
import { cartSessionHeaders } from "@/lib/cart/cart-session";
import { hasAccessToken } from "@/lib/auth/tokens";
import type {
  AutocompleteResponse,
  Facets,
  RecResponse,
  SearchResponse,
} from "@/lib/api/types";

/**
 * Build the search filter query. The endpoint already flattens `filters[...]`
 * (kept for category/brand/price/rating) and the contract says it ALSO accepts
 * the NEW filters at the top level — so brandIds / inStock / onSale / opt[...]
 * are emitted top-level (verbatim wire names).
 */
function searchFilterParams(params: SearchParams) {
  return compactParams({
    "filters[categoryId]": params.categoryId,
    "filters[priceMinPaisa]": params.priceMinPaisa,
    "filters[priceMaxPaisa]": params.priceMaxPaisa,
    "filters[rating]": params.rating,
    // NEW filters — top-level per contract.
    brandIds: unionBrandIds(params.brandId, params.brandIds),
    inStock: params.inStock ? "true" : undefined,
    onSale: params.onSale ? "true" : undefined,
    ...optionParams(params.options),
  });
}

function searchQuery(params: SearchParams, cursor?: string) {
  return {
    q: params.q,
    sort: params.sort ?? "relevance",
    limit: params.limit ?? 24,
    cursor,
    ...searchFilterParams(params),
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

/**
 * Faceted-filter aggregates for the search context.
 * GET /v1/search/facets (requires q) — returns { data: Facets }.
 * Computed over the q-matched BASE SET; the backend ignores narrowing by the
 * current selections (keeps options visible while toggling).
 */
export function useSearchFacets(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: qk.searchFacets(params),
    queryFn: () =>
      http.get<Facets>("/search/facets", { params: searchQuery(params) }),
    enabled: enabled && params.q.trim().length > 0,
    staleTime: 60_000,
  });
}

/** Typo-tolerant autocomplete (min 2 chars); also returns a "did you mean". */
export function useAutocomplete(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: qk.autocomplete(q),
    queryFn: () =>
      http.get<AutocompleteResponse>("/search/autocomplete", {
        params: { q },
      }),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}

/** Top recent searches — powers the empty-state search dropdown. */
export function useTrending(enabled = true) {
  return useQuery({
    queryKey: qk.trending(),
    queryFn: () => http.get<{ items: string[] }>("/search/trending"),
    enabled,
    staleTime: 5 * 60_000,
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
