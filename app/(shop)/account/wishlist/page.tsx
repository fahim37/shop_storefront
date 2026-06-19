"use client";

import Link from "next/link";
import { ArrowRight, Heart, Store, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="overflow-hidden rounded-2xl shadow-[var(--shadow-card)]">
        <CardHeader className="border-b border-border">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="p-0">
          <ul>
            {Array.from({ length: 3 }).map((_, i) => (
              <WishlistRowSkeleton key={i} />
            ))}
          </ul>
        </CardContent>
      </Card>
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
          <Button asChild>
            <Link href="/">Start shopping</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl shadow-[var(--shadow-card)]">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">My wishlist ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul>
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <WishlistRow key={item.productId} item={item} />
            ))}
          </AnimatePresence>
        </ul>
      </CardContent>
    </Card>
  );
}

function WishlistRowSkeleton() {
  return (
    <li className="flex flex-col gap-4 border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-center">
      <Skeleton className="size-[84px] shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-20 rounded-md" />
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <Skeleton className="h-5 w-16" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="size-9 rounded-md" />
        </div>
      </div>
    </li>
  );
}

function WishlistRow({ item }: { item: WishlistItem }) {
  const remove = useRemoveWishlist();
  const reduce = useReducedMotion();
  const inStock = item.minPricePaisa !== null;
  const productHref = `/product/${item.productSlug}`;

  return (
    <motion.li
      layout
      initial={false}
      exit={
        reduce
          ? { opacity: 0 }
          : { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }
      }
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="flex flex-col gap-4 overflow-hidden border-b border-border px-5 py-4 last:border-b-0 sm:flex-row sm:items-center">
      <Link
        href={productHref}
        className="size-[84px] shrink-0 overflow-hidden rounded-xl border border-border"
      >
        <MediaImage
          mediaId={item.thumbnailMediaId}
          variant="thumbnail"
          alt={item.productTitle}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link
          href={productHref}
          className="line-clamp-2 text-sm font-bold transition-colors hover:text-primary"
        >
          {item.productTitle}
        </Link>

        {item.vendorName && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-faint">
            <Store className="size-3.5 text-primary" />
            {item.vendorName}
          </span>
        )}

        <span
          className={cn(
            "inline-flex w-max items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-extrabold",
            inStock ? "bg-green-soft text-green" : "bg-red/10 text-red",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              inStock ? "bg-green" : "bg-red",
            )}
          />
          {inStock ? "In stock" : "Out of stock"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <Price pricePaisa={item.minPricePaisa} size="md" />

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={productHref}>
              View product
              <ArrowRight className="size-4" strokeWidth={2.4} />
            </Link>
          </Button>
          <Button
            type="button"
            variant="soft"
            size="icon-sm"
            aria-label={`Remove ${item.productTitle} from wishlist`}
            loading={remove.isPending && remove.variables === item.productId}
            onClick={() => remove.mutate(item.productId)}
            className="text-faint hover:text-red"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </motion.li>
  );
}
