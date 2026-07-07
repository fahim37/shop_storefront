"use client";

import Link from "next/link";
import { Heart, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/ui/rating-stars";
import { useFollowedStores, useToggleFollowStore } from "@/lib/api/engagement";
import type { FollowedStore } from "@/lib/api/types";

export default function FollowedStoresPage() {
  const { data, isLoading } = useFollowedStores();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            Followed stores
          </h1>
          <p className="text-sm text-sub">Stores you follow for new arrivals and deals.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <FollowedStoreSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const stores = data ?? [];

  if (stores.length === 0) {
    return (
      <EmptyState
        className="my-6"
        icon={<Heart className="size-6" />}
        title="You're not following any stores yet"
        description="Follow a store from its page to get updates on new arrivals and deals."
        action={
          <Button asChild variant="accent">
            <Link href="/">Discover stores</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
          Followed stores <span className="text-sub">({stores.length})</span>
        </h1>
        <p className="text-sm text-sub">Stores you follow for new arrivals and deals.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((store) => (
          <FollowedStoreCard key={store.vendorId} store={store} />
        ))}
      </div>
    </div>
  );
}

function FollowedStoreSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <Skeleton className="size-14 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
    </div>
  );
}

function FollowedStoreCard({ store }: { store: FollowedStore }) {
  const { toggle, pending } = useToggleFollowStore(store.vendorId);
  const rating = store.ratingAverage ? Number(store.ratingAverage) : null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-pop)]">
      <Link
        href={`/store/${store.storeSlug}`}
        className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted"
      >
        {store.storeLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.storeLogoUrl}
            alt={store.storeName}
            className="size-full object-cover"
          />
        ) : (
          <StoreIcon className="size-6 text-faint" strokeWidth={1.6} />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/store/${store.storeSlug}`}
          className="block truncate text-sm font-extrabold text-ink hover:text-primary"
        >
          {store.storeName}
        </Link>
        {rating !== null ? (
          <span className="mt-0.5 flex items-center gap-1 text-11 text-faint">
            <RatingStars value={rating} size={11} />
            <b className="text-ink">{rating.toFixed(1)}</b>
          </span>
        ) : null}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        loading={pending}
        onClick={toggle}
      >
        Unfollow
      </Button>
    </div>
  );
}
