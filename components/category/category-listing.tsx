"use client";

import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ActiveFilterChips,
  FilterSheet,
  FilterSidebar,
} from "@/components/product/filters";
import {
  SortSelect,
  LISTING_SORT_OPTIONS,
} from "@/components/product/sort-select";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { fromProductRow } from "@/lib/api/card";
import {
  flattenProducts,
  useListingFacets,
  useProductsInfinite,
} from "@/lib/api/catalog";
import { takaToPaisa, useFilterParams } from "@/lib/use-filters";
import type { CategoryNode, CursorMeta, ProductCardRow } from "@/lib/api/types";
import type { ProductListParams } from "@/lib/api/query-keys";

export interface CategoryListingProps {
  categoryId: string;
  subcategories: CategoryNode[];
  /** Server-fetched DEFAULT first page (no filters/sort) — see the page. */
  initialPage?: { data: ProductCardRow[]; meta?: CursorMeta };
}

/**
 * Client island for the category browse page: reads every filter from the URL,
 * renders a cursor-paginated product grid with a facet-driven desktop filter
 * rail + mobile filter sheet, plus a sort dropdown (listing variant).
 */
export function CategoryListing({
  categoryId,
  subcategories,
  initialPage,
}: CategoryListingProps) {
  const { get, getList, getOptions, activeCount } = useFilterParams();

  // The server seed represents the unfiltered default listing; only hand it
  // to the query when the URL matches that state, else it would briefly show
  // the wrong (unfiltered) results under an active filter/sort.
  const isDefaultView = activeCount === 0 && !get("sort");

  const params: ProductListParams = {
    categoryId,
    brandIds: getList("brand"),
    minPricePaisa: takaToPaisa(get("minPrice")),
    maxPricePaisa: takaToPaisa(get("maxPrice")),
    rating: get("rating") ? Number(get("rating")) : undefined,
    inStock: get("instock") === "1" || undefined,
    onSale: get("sale") === "1" || undefined,
    options: getOptions(),
    sort: get("sort") || undefined,
    limit: 20,
  };

  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isFetchingNextPage,
    isPlaceholderData,
  } = useProductsInfinite(params, isDefaultView ? initialPage : undefined);

  const { data: facets } = useListingFacets({ categoryId });

  const rows = flattenProducts(data?.pages);
  const products = rows.map(fromProductRow);

  // A filter/sort change refetches while the PREVIOUS grid stays on screen
  // (keepPreviousData) — dim it instead of flashing a skeleton.
  const updating = isPlaceholderData && isFetching;
  const showSkeleton = isLoading || (updating && products.length === 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <FilterSidebar facets={facets} subcategories={subcategories} />

      <div className="flex min-w-0 flex-col gap-4">
        {/* Toolbar: result hint + sort + mobile filters */}
        <div className="flex items-center justify-between gap-3">
          <p
            className="min-w-0 truncate text-13 font-semibold text-sub"
            aria-live="polite"
          >
            {showSkeleton
              ? "Loading products…"
              : updating
                ? "Updating…"
                : products.length > 0
                  ? `${products.length}${hasNextPage ? "+" : ""} product${
                      products.length === 1 ? "" : "s"
                    }`
                  : "No products"}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <SortSelect options={LISTING_SORT_OPTIONS} defaultValue="newest" />
            <FilterSheet
              facets={facets}
              subcategories={subcategories}
              resultCount={showSkeleton ? undefined : products.length}
              resultHasMore={hasNextPage}
              resultLoading={showSkeleton || updating}
            />
          </div>
        </div>

        <ActiveFilterChips facets={facets} />

        {showSkeleton ? (
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
          <div
            aria-busy={updating}
            className={cn(
              "flex flex-col gap-4 transition-opacity duration-200",
              updating && "pointer-events-none opacity-50",
            )}
          >
            <ProductGrid cols={5} products={products} />

            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => fetchNextPage()}
                  loading={isFetchingNextPage}
                  disabled={isFetchingNextPage || updating}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
