"use client";

import * as React from "react";
import { Search as SearchIcon, SearchX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/product/product-grid";
import {
  ActiveFilterChips,
  FilterSheet,
  FilterSidebar,
} from "@/components/product/filters";
import { SortSelect } from "@/components/product/sort-select";
import { fromSearchHit } from "@/lib/api/card";
import { useFilterParams, takaToPaisa } from "@/lib/use-filters";
import { useBrands } from "@/lib/api/catalog";
import { recordSearchClick, useSearchInfinite } from "@/lib/api/search";
import type { SearchParams } from "@/lib/api/query-keys";

function SearchResults() {
  const { get } = useFilterParams();

  const q = get("q").trim();
  const sort = get("sort");
  const brand = get("brand");
  const minPrice = get("minPrice");
  const maxPrice = get("maxPrice");
  const rating = get("rating");

  const params: SearchParams = {
    q,
    sort: sort || undefined,
    brandId: brand || undefined,
    priceMinPaisa: takaToPaisa(minPrice),
    priceMaxPaisa: takaToPaisa(maxPrice),
    rating: rating ? Number(rating) : undefined,
  };

  const { data: brandData } = useBrands();
  const brands = brandData ?? [];

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useSearchInfinite(params, q.length > 0);

  // Empty query → friendly prompt (the header search bar drives `q`).
  if (q.length === 0) {
    return (
      <EmptyState
        icon={<SearchIcon className="size-6" strokeWidth={2.4} />}
        title="Search for products"
        description="Type what you're looking for in the search bar above — try a brand, a category, or a specific item."
      />
    );
  }

  const pages = data?.pages ?? [];
  const hits = pages.flatMap((p) => p.items);
  const products = hits.map(fromSearchHit);
  const totalLabel = hasNextPage ? `${hits.length}+` : `${hits.length}`;
  // First page carries the analytics id; "" means logging is disabled server-side.
  const searchQueryId = pages[0]?.searchQueryId ?? "";

  // Best-effort click analytics: fire-and-forget on capture so it never blocks
  // navigation. We can't add props to the shared ProductCard, so we resolve the
  // clicked hit from the product link's `/product/<slug>` href. `recordSearchClick`
  // is a no-op when `searchQueryId` is "".
  const handleResultsClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!searchQueryId) return;
    const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
      'a[href^="/product/"]',
    );
    if (!anchor) return;
    const slug = anchor.getAttribute("href")?.replace("/product/", "");
    if (!slug) return;
    const index = hits.findIndex((h) => h.slug === slug);
    if (index < 0) return;
    recordSearchClick(searchQueryId, hits[index].productId, index);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Heading + result hint */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            Results for &ldquo;{q}&rdquo;
          </h1>
          {pages[0]?.semanticEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-soft px-2.5 py-1 text-[11px] font-extrabold text-primary">
              <Sparkles className="size-3" strokeWidth={2.6} />
              AI
            </span>
          )}
        </div>
        <p className="text-[13px] font-semibold text-sub">
          {isLoading
            ? "Searching…"
            : `${totalLabel} ${hits.length === 1 ? "result" : "results"} found`}
        </p>
      </div>

      {/* Toolbar: filters (mobile) + sort */}
      <div className="flex items-center justify-between gap-3">
        <FilterSheet brands={brands} showRating />
        <div className="ml-auto">
          <SortSelect />
        </div>
      </div>

      <ActiveFilterChips brands={brands} />

      {/* Body: sidebar + results */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar brands={brands} showRating />

        <div className="min-w-0">
          {isLoading ? (
            <ProductGridSkeleton count={12} cols={4} />
          ) : isError ? (
            <EmptyState
              icon={<SearchX className="size-6" strokeWidth={2.4} />}
              title="Something went wrong"
              description="We couldn't load search results right now. Please try again in a moment."
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<SearchX className="size-6" strokeWidth={2.4} />}
              title={`No results for “${q}”`}
              description="Try a different search term or clear your filters to see more products."
            />
          ) : (
            <>
              {/* Best-effort search-click analytics; cards stay keyboard-navigable links. */}
              <div onClickCapture={handleResultsClick}>
                <ProductGrid products={products} cols={4} />
              </div>

              {hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage && <Spinner className="size-4" />}
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="wrap py-4">
      <React.Suspense fallback={<ProductGridSkeleton count={12} cols={4} />}>
        <SearchResults />
      </React.Suspense>
    </div>
  );
}
