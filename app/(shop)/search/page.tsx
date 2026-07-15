"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search as SearchIcon,
  SearchX,
  Lightbulb,
  Store as StoreIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingStars } from "@/components/ui/rating-stars";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/product/product-grid";
import {
  ActiveFilterChips,
  FilterSheet,
  FilterSidebar,
} from "@/components/product/filters";
import {
  SortSelect,
  SEARCH_SORT_OPTIONS,
} from "@/components/product/sort-select";
import { fromSearchHit } from "@/lib/api/card";
import { useFilterParams, takaToPaisa } from "@/lib/use-filters";
import {
  recordSearchClick,
  useSearchFacets,
  useSearchInfinite,
} from "@/lib/api/search";
import type { SearchParams } from "@/lib/api/query-keys";
import type { SearchStoreHit } from "@/lib/api/types";

function SearchResults() {
  const { get, getList, getOptions } = useFilterParams();

  const q = get("q").trim();
  const sort = get("sort");
  const minPrice = get("minPrice");
  const maxPrice = get("maxPrice");
  const rating = get("rating");

  const params: SearchParams = {
    q,
    sort: sort || undefined,
    brandIds: getList("brand"),
    priceMinPaisa: takaToPaisa(minPrice),
    priceMaxPaisa: takaToPaisa(maxPrice),
    rating: rating ? Number(rating) : undefined,
    inStock: get("instock") === "1" || undefined,
    onSale: get("sale") === "1" || undefined,
    options: getOptions(),
  };

  const { data: facets } = useSearchFacets({ q });

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isFetchingNextPage,
    isPlaceholderData,
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
  // Store-name matches ride on the first page only.
  const stores = pages[0]?.stores ?? [];
  const totalLabel = hasNextPage ? `${hits.length}+` : `${hits.length}`;

  // A filter/sort/query change refetches while the PREVIOUS hits stay on
  // screen (keepPreviousData) — dim them instead of flashing a skeleton.
  const updating = isPlaceholderData && isFetching;
  const showSkeleton = isLoading || (updating && products.length === 0);
  // First page carries the analytics id; "" means logging is disabled server-side.
  const searchQueryId = pages[0]?.searchQueryId ?? "";

  // Best-effort click analytics: fire-and-forget on capture so it never blocks
  // navigation. The clicked card is resolved via the `data-product-id` the
  // shared ProductCard stamps on its root link — stable even if the card's
  // href shape changes. `recordSearchClick` is a no-op when `searchQueryId` is "".
  const handleResultsClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!searchQueryId) return;
    const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>(
      "a[data-product-id]",
    );
    const productId = anchor?.getAttribute("data-product-id");
    if (!productId) return;
    const index = hits.findIndex((h) => h.productId === productId);
    if (index < 0) return;
    recordSearchClick(searchQueryId, productId, index);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Heading + result hint */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            Results for &ldquo;{q}&rdquo;
          </h1>
        </div>
        <p className="text-13 font-semibold text-sub" aria-live="polite">
          {showSkeleton || updating
            ? "Searching…"
            : `${totalLabel} ${hits.length === 1 ? "result" : "results"} found`}
        </p>
      </div>

      {/* Auto-correction notice — the backend snapped a typo'd query to the
          closest catalog vocabulary ("hedphones" → "headphones") and ranked
          exact matches for the corrected term into these results. */}
      {!showSkeleton && !updating && products.length > 0 && pages[0]?.correctedQuery && (
        <p className="flex items-center gap-2 self-start rounded-lg border border-blue-soft bg-blue-soft/40 px-3 py-2 text-13 font-semibold text-ink">
          <Lightbulb className="size-4 shrink-0 text-amber-500" strokeWidth={2.2} />
          <span>
            Including results for{" "}
            <span className="font-extrabold text-primary">
              {pages[0].correctedQuery}
            </span>
          </span>
        </p>
      )}

      {/* "Did you mean" hint — shown when the exact term didn't match but we
          found close (typo/semantic) results anyway, so the smart matching is
          visible instead of silent. The zero-results case is handled below. */}
      {!showSkeleton && !updating && products.length > 0 && pages[0]?.suggestion && (
        <Link
          href={`/search?q=${encodeURIComponent(pages[0].suggestion)}`}
          className="flex items-center gap-2 self-start rounded-lg border border-blue-soft bg-blue-soft/40 px-3 py-2 text-13 font-semibold text-ink hover:bg-blue-soft"
        >
          <Lightbulb className="size-4 shrink-0 text-amber-500" strokeWidth={2.2} />
          <span>
            Did you mean{" "}
            <span className="font-extrabold text-primary">
              {pages[0].suggestion}
            </span>
            ?
          </span>
        </Link>
      )}

      {/* Stores whose name matched the query — shown even when no products
          match (searching a store's name should always lead to its page). */}
      {!showSkeleton && stores.length > 0 && (
        <section aria-label="Matching stores" className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
            <StoreIcon className="size-4 text-primary" strokeWidth={2.2} />
            Stores
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <StoreHitCard key={store.vendorId} store={store} />
            ))}
          </div>
        </section>
      )}

      {/* Toolbar: filters (mobile) + sort */}
      <div className="flex items-center justify-between gap-3">
        <FilterSheet
          facets={facets}
          resultCount={showSkeleton ? undefined : hits.length}
          resultHasMore={hasNextPage}
          resultLoading={showSkeleton || updating}
        />
        <div className="ml-auto">
          <SortSelect options={SEARCH_SORT_OPTIONS} defaultValue="relevance" />
        </div>
      </div>

      <ActiveFilterChips facets={facets} />

      {/* Body: sidebar + results */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar facets={facets} />

        <div className="min-w-0">
          {showSkeleton ? (
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
              action={
                pages[0]?.suggestion ? (
                  <Button asChild variant="outline">
                    <Link
                      href={`/search?q=${encodeURIComponent(pages[0].suggestion)}`}
                    >
                      Did you mean &ldquo;{pages[0].suggestion}&rdquo;?
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div
              aria-busy={updating}
              className={cn(
                "transition-opacity duration-200",
                updating && "pointer-events-none opacity-50",
              )}
            >
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
                    disabled={isFetchingNextPage || updating}
                  >
                    {isFetchingNextPage && <Spinner className="size-4" />}
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

function StoreHitCard({ store }: { store: SearchStoreHit }) {
  const rating = store.ratingAverage;
  return (
    <Link
      href={`/store/${store.storeSlug}`}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-pop)]"
    >
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
        {store.storeLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.storeLogoUrl}
            alt={store.storeName}
            className="size-full object-cover"
          />
        ) : (
          <StoreIcon className="size-5 text-faint" strokeWidth={1.6} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold text-ink group-hover:text-primary">
          {store.storeName}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-11 text-faint">
          {rating !== null && (
            <span className="flex items-center gap-1">
              <RatingStars value={rating} size={11} />
              <b className="text-ink">{rating.toFixed(1)}</b>
            </span>
          )}
          <span>
            {store.productCount}{" "}
            {store.productCount === 1 ? "product" : "products"}
          </span>
        </span>
      </span>

      <span className="shrink-0 text-11 font-extrabold text-primary">
        Visit store
      </span>
    </Link>
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
