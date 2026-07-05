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
  useProductsInfinite,
  useShopFacets,
} from "@/lib/api/catalog";
import { takaToPaisa, useFilterParams } from "@/lib/use-filters";
import type { CursorMeta, ProductCardRow } from "@/lib/api/types";
import type { ProductListParams } from "@/lib/api/query-keys";

/**
 * Global product browse page ("/shop"). Same engine as the category listing —
 * URL-driven filters, facet rail, sort, infinite scroll — but with no category
 * scope (facets are computed catalog-wide). Powers the homepage "View all"
 * links and the header catbar, e.g. /shop?sort=best_selling or /shop?sale=1.
 */

const HEADINGS: Record<string, { title: string; subtitle: string }> = {
  best_selling: {
    title: "Best sellers",
    subtitle: "Most ordered across Bangladesh",
  },
  newest: { title: "New arrivals", subtitle: "Fresh from local stores" },
  rating_desc: { title: "Top rated", subtitle: "Highest-rated products" },
};

export function ShopListing({
  initialPage,
}: {
  /** Server-fetched DEFAULT first page (no filters/sort) — see the page. */
  initialPage?: { data: ProductCardRow[]; meta?: CursorMeta };
}) {
  const { get, getList, getOptions, activeCount } = useFilterParams();

  const sort = get("sort");
  const onSale = get("sale") === "1";

  // Seed only the unfiltered default view (mirrors CategoryListing).
  const isDefaultView = activeCount === 0 && !sort;

  const params: ProductListParams = {
    brandIds: getList("brand"),
    minPricePaisa: takaToPaisa(get("minPrice")),
    maxPricePaisa: takaToPaisa(get("maxPrice")),
    rating: get("rating") ? Number(get("rating")) : undefined,
    inStock: get("instock") === "1" || undefined,
    onSale: onSale || undefined,
    options: getOptions(),
    sort: sort || undefined,
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

  const { data: facets } = useShopFacets();

  const rows = flattenProducts(data?.pages);
  const products = rows.map(fromProductRow);

  // A filter/sort change refetches while the PREVIOUS grid stays on screen
  // (keepPreviousData) — dim it instead of flashing a skeleton.
  const updating = isPlaceholderData && isFetching;
  const showSkeleton = isLoading || (updating && products.length === 0);

  const heading = onSale
    ? { title: "Flash sale", subtitle: "Discounted right now" }
    : (HEADINGS[sort] ?? { title: "All products", subtitle: "Browse the full catalog" });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
          {heading.title}
        </h1>
        <p className="text-13 font-semibold text-sub">{heading.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar facets={facets} />

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
                resultCount={showSkeleton ? undefined : products.length}
                resultHasMore={hasNextPage}
                resultLoading={showSkeleton || updating}
              />
            </div>
          </div>

          <ActiveFilterChips facets={facets} />

          {showSkeleton ? (
            <ProductGridSkeleton count={9} cols={5} />
          ) : isError ? (
            <EmptyState
              icon={<PackageSearch className="size-7" strokeWidth={1.6} />}
              title="Couldn't load products"
              description="Something went wrong while fetching products. Please try again."
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
    </div>
  );
}
