"use client";

import {
  useInfiniteQuery,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk, type ProductListParams } from "@/lib/api/query-keys";
import type {
  Brand,
  CategoryAttribute,
  CategoryNode,
  ProductCardRow,
  ProductDetail,
  RecResponse,
} from "@/lib/api/types";

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
          categoryId: params.categoryId,
          brandId: params.brandId,
          minPricePaisa: params.minPricePaisa,
          maxPricePaisa: params.maxPricePaisa,
          limit,
          cursor: pageParam,
        },
      }),
    getNextPageParam: (last) =>
      last.meta?.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
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

/* ----------------------------------------------------------------------- */
/* Category tree helpers                                                   */
/* ----------------------------------------------------------------------- */

/** Depth-first flatten of the category tree. */
export function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (n: CategoryNode) => {
    out.push(n);
    n.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

/** Find a category node by slug anywhere in the tree. */
export function findCategoryBySlug(
  nodes: CategoryNode[],
  slug: string,
): CategoryNode | null {
  for (const n of nodes) {
    if (n.slug === slug) return n;
    const found = findCategoryBySlug(n.children ?? [], slug);
    if (found) return found;
  }
  return null;
}
