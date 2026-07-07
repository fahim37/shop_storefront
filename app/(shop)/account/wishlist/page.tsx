"use client";

import Link from "next/link";
import { Heart, Store } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/ui/price";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRemoveWishlist, useWishlist } from "@/lib/api/engagement";
import type { WishlistItem } from "@/lib/api/types";

export default function WishlistPage() {
  const { data, isLoading } = useWishlist();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
            My wishlist
          </h1>
          <p className="text-sm text-sub">Products you&apos;ve saved for later.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <WishlistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const items = data ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        className="my-6"
        icon={<Heart className="size-6" />}
        title="Your wishlist is empty"
        description="Tap the heart on any product to save it here for later."
        action={
          <Button asChild variant="accent">
            <Link href="/">Start shopping</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
          My wishlist{" "}
          <span className="text-sub">({items.length})</span>
        </h1>
        <p className="text-sm text-sub">Products you&apos;ve saved for later.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <WishlistCard key={item.productId} item={item} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function WishlistCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}

function WishlistCard({ item }: { item: WishlistItem }) {
  const remove = useRemoveWishlist();
  const reduce = useReducedMotion();
  const inStock = item.minPricePaisa !== null;
  const productHref = `/product/${item.productSlug}`;
  const removing = remove.isPending && remove.variables === item.productId;

  return (
    <motion.div
      layout
      initial={false}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-pop)]"
    >
      <div className="relative">
        <Link
          href={productHref}
          className="block aspect-square overflow-hidden bg-muted"
        >
          <MediaImage
            mediaId={item.thumbnailMediaId}
            variant="card"
            alt={item.productTitle}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        {!inStock && (
          <span className="absolute left-2 top-2 rounded-md bg-navy px-2 py-0.5 text-2xs font-extrabold text-white">
            Out of stock
          </span>
        )}

        <button
          type="button"
          aria-label={`Remove ${item.productTitle} from wishlist`}
          disabled={removing}
          onClick={() => remove.mutate(item.productId)}
          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-card/95 text-red shadow-[var(--shadow-card)] backdrop-blur transition-transform hover:scale-110 active:scale-95 disabled:opacity-60"
        >
          {removing ? (
            <span className="size-4 animate-spin rounded-full border-2 border-red border-t-transparent" />
          ) : (
            <Heart className="size-4 fill-current" />
          )}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <Link
          href={productHref}
          className="line-clamp-2 min-h-[2.4em] text-13 font-bold leading-snug text-ink transition-colors hover:text-primary"
        >
          {item.productTitle}
        </Link>

        {item.vendorName && (
          item.vendorSlug ? (
            <Link
              href={`/store/${item.vendorSlug}`}
              className="mt-1 inline-flex items-center gap-1 truncate text-11 font-bold text-faint hover:text-primary hover:underline"
            >
              <Store className="size-3 shrink-0 text-primary" />
              <span className="truncate">{item.vendorName}</span>
            </Link>
          ) : (
            <span className="mt-1 inline-flex items-center gap-1 truncate text-11 font-bold text-faint">
              <Store className="size-3 shrink-0 text-primary" />
              <span className="truncate">{item.vendorName}</span>
            </span>
          )
        )}

        <div className="mt-2">
          <Price pricePaisa={item.minPricePaisa} size="md" />
        </div>

        <Button
          asChild
          variant="primary"
          size="sm"
          className={cn("mt-3 w-full", !inStock && "opacity-90")}
        >
          <Link href={productHref}>{inStock ? "View product" : "See details"}</Link>
        </Button>
      </div>
    </motion.div>
  );
}
