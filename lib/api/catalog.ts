"use client";

import {
  useInfiniteQuery,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk, type ProductListParams } from "@/lib/api/query-keys";
import {
  compactParams,
  optionParams,
  unionBrandIds,
} from "@/lib/api/filter-params";
import type {
  Brand,
  CategoryAttribute,
  CategoryNode,
  Facets,
  ProductCardRow,
  ProductDetail,
  RecResponse,
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

/** Cursor-paginated product listing (cursor lives in `meta.nextCursor`). */
export function useProductsInfinite(params: ProductListParams = {}) {
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

export function useProduct(
  slug: string,
  options?: Partial<UseQueryOptions<ProductDetail>>,
) {
  return useQuery({
    queryKey: qk.product(slug),
    queryFn: () => http.get<ProductDetail>(`/products/${slug}`),
    enabled: !!slug,
    ...options,
  });
}

export function useRelatedProducts(productId: string | undefined) {
  return useQuery({
    queryKey: qk.productRelated(productId ?? ""),
    queryFn: () =>
      http.get<RecResponse>(`/products/${productId}/recommendations/related`),
    enabled: !!productId,
  });
}

/* ----------------------------------------------------------------------- */
/* Categories & brands                                                     */
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

export function useCategoryAttributes(categoryId: string | undefined) {
  return useQuery({
    queryKey: qk.categoryAttributes(categoryId ?? ""),
    queryFn: () =>
      http.get<CategoryAttribute[]>(`/categories/${categoryId}/attributes`),
    enabled: !!categoryId,
    staleTime: 5 * 60_000,
  });
}

export function useBrands(options?: Partial<UseQueryOptions<Brand[]>>) {
  return useQuery({
    queryKey: qk.brands(),
    queryFn: () => http.get<Brand[]>("/brands"),
    staleTime: 5 * 60_000,
    ...options,
  });
}

// Pure category-tree helpers moved to `@/lib/category-tree` so Server
// Components can call them too. Re-exported here for existing client imports.
export { flattenCategories, findCategoryBySlug } from "@/lib/category-tree";
