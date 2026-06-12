"use client";

import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ActiveFilterChips,
  FilterSheet,
  FilterSidebar,
} from "@/components/product/filters";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { fromProductRow } from "@/lib/api/card";
import { flattenProducts, useProductsInfinite } from "@/lib/api/catalog";
import { takaToPaisa, useFilterParams } from "@/lib/use-filters";
import type { Brand, CategoryNode } from "@/lib/api/types";

export interface CategoryListingProps {
  categoryId: string;
  brands: Brand[];
  subcategories: CategoryNode[];
}

/**
 * Client island for the category browse page: reads brand/price filters from
 * the URL and renders a cursor-paginated product grid with a desktop filter
 * rail + mobile filter sheet. NOTE: the /products endpoint has no `sort`, so
 * there is intentionally no SortSelect here.
 */
export function CategoryListing({
  categoryId,
  brands,
  subcategories,
}: CategoryListingProps) {
  const { get } = useFilterParams();

  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useProductsInfinite({
    categoryId,
    brandId: get("brand") || undefined,
    minPricePaisa: takaToPaisa(get("minPrice")),
    maxPricePaisa: takaToPaisa(get("maxPrice")),
    limit: 20,
  });

  const rows = flattenProducts(data?.pages);
  const products = rows.map(fromProductRow);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <FilterSidebar brands={brands} subcategories={subcategories} />

      <div className="flex min-w-0 flex-col gap-4">
        {/* Toolbar: result hint + mobile filters */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-sub">
            {isLoading
              ? "Loading products…"
              : products.length > 0
                ? `Showing ${products.length} product${products.length === 1 ? "" : "s"}${
                    hasNextPage ? "+" : ""
                  }`
                : "No products"}
          </p>
          <FilterSheet brands={brands} subcategories={subcategories} />
        </div>

        <ActiveFilterChips brands={brands} />

        {isLoading ? (
          <ProductGridSkeleton count={10} cols={5} />
        ) : isError ? (
          <EmptyState
            icon={<PackageSearch className="size-7" strokeWidth={1.6} />}
            title="Couldn't load products"
            description="Something went wrong while fetching this category. Please try again."
            action={
              <Button variant="primary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="size-7" strokeWidth={1.6} />}
            title="No products found"
            description="Try removing some filters or widening your price range."
          />
        ) : (
          <>
            <ProductGrid cols={5} products={products} />

            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fetchNextPage()}
                  loading={isFetchingNextPage}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
