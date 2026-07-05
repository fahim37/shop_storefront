"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { http, type ListEnvelope } from "@/lib/api/http";
import { qk, type ProductListParams } from "@/lib/api/query-keys";
import {
  compactParams,
  optionParams,
  unionBrandIds,
} from "@/lib/api/filter-params";
import type {
  CategoryNode,
  Facets,
  ProductCardRow,
} from "@/lib/api/types";

/** Build the flat filter query the /products (listing) endpoint reads. */
function listingQuery(params: ProductListParams) {
  return compactParams({
    categoryId: params.categoryId,
    brandIds: unionBrandIds(params.brandId, params.brandIds),
    priceMinPaisa: params.minPricePaisa,
    priceMaxPaisa: params.maxPricePaisa,
    rating: params.rating,
    inStock: params.inStock ? "true" : undefined,
    onSale: params.onSale ? "true" : undefined,
    sort: params.sort,
    ...optionParams(params.options),
  });
}

/* ----------------------------------------------------------------------- */
/* Products                                                                */
/* ----------------------------------------------------------------------- */

/**
 * Cursor-paginated product listing (cursor lives in `meta.nextCursor`).
 *
 * `initialPage` seeds the cache with a server-rendered first page (see the
 * category/shop pages) so the grid paints instantly on landing instead of
 * waiting for hydration + a client fetch. Callers must only pass it when the
 * current `params` match what the server fetched (i.e. the default,
 * unfiltered view) — otherwise the seed would masquerade as filtered results.
 */
export function useProductsInfinite(
  params: ProductListParams = {},
  initialPage?: ListEnvelope<ProductCardRow>,
) {
  const limit = params.limit ?? 20;
  return useInfiniteQuery({
    queryKey: qk.products(params),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      http.getList<ProductCardRow>("/products", {
        params: {
          ...listingQuery(params),
          limit,
          cursor: pageParam,
        },
      }),
    getNextPageParam: (last) =>
      last.meta?.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [undefined] }
      : undefined,
    // Filter/sort changes keep the previous grid on screen (dimmed by the
    // listing) instead of flashing a skeleton; `isPlaceholderData` flags it.
    placeholderData: keepPreviousData,
  });
}

/**
 * Faceted-filter aggregates for the listing/category context.
 * GET /v1/products/facets — returns the standard envelope { data: Facets }.
 * Facet availability is computed over the BASE SET (category descendants); the
 * backend ignores narrowing by the current selections, so passing them is safe
 * but we only need categoryId here.
 */
export function useListingFacets(
  params: ProductListParams,
  enabled = true,
) {
  return useQuery({
    queryKey: qk.listingFacets(params),
    queryFn: () =>
      http.get<Facets>("/products/facets", { params: listingQuery(params) }),
    enabled: enabled && !!params.categoryId,
    staleTime: 60_000,
  });
}

/**
 * Global facets across ALL published products (no category scope) — powers the
 * /shop browse page's filter rail. The backend's /products/facets computes over
 * the base set, so omitting categoryId yields catalog-wide facets.
 */
export function useShopFacets(enabled = true) {
  return useQuery({
    queryKey: qk.listingFacets({ categoryId: "__all__" }),
    queryFn: () => http.get<Facets>("/products/facets"),
    enabled,
    staleTime: 60_000,
  });
}

/** Flatten an infinite-products result into a single product array. */
export function flattenProducts(
  pages: Array<{ data: ProductCardRow[] }> | undefined,
): ProductCardRow[] {
  return pages?.flatMap((p) => p.data) ?? [];
}

/* ----------------------------------------------------------------------- */
/* Categories                                                              */
/* ----------------------------------------------------------------------- */

export function useCategoryTree(
  options?: Partial<UseQueryOptions<CategoryNode[]>>,
) {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: () => http.get<CategoryNode[]>("/categories"),
    staleTime: 5 * 60_000,
    ...options,
  });
}

// Pure category-tree helpers moved to `@/lib/category-tree` so Server
// Components can call them too. Re-exported here for existing client imports.
export { flattenCategories, findCategoryBySlug } from "@/lib/category-tree";
