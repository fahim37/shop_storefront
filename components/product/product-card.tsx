"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { discountPercent, formatCompact, formatRating } from "@/lib/format";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { Skeleton } from "@/components/ui/skeleton";
import { WishlistButton } from "@/components/product/wishlist-button";
import type { CardProduct } from "@/lib/api/card";

export type { CardProduct } from "@/lib/api/card";

/* ---- card ---- */

export function ProductCard({
  product,
  className,
}: {
  product: CardProduct;
  className?: string;
}) {
  const pct = discountPercent(product.pricePaisa, product.comparePaisa);
  const href = `/product/${product.slug}`;

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden">
        <Link href={href} aria-label={product.title} tabIndex={-1}>
          <MediaImage
            mediaId={product.thumbnailMediaId}
            variant="card"
            alt={product.title}
            className="transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </Link>
        {pct ? (
          <span className="absolute left-2.5 top-2.5 rounded bg-amber px-1.5 py-0.5 text-[11px] font-extrabold text-blue-deep">
            -{pct}%
          </span>
        ) : null}
        <WishlistButton
          productId={product.id}
          heartClassName="size-4"
          className="absolute right-2 top-2 size-8 rounded-full bg-white/92 text-sub shadow-sm backdrop-blur hover:text-red"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <Link
          href={href}
          className="line-clamp-1 text-[13.5px] font-semibold text-ink hover:text-primary"
        >
          {product.title}
        </Link>

        <div className="flex items-center gap-1.5 text-[11.5px] text-faint">
          {product.ratingAverage && Number(product.ratingAverage) > 0 ? (
            <>
              <RatingStars value={product.ratingAverage} size={11} />
              <b className="text-ink">{formatRating(product.ratingAverage)}</b>
              {product.ratingCount ? <span>({formatCompact(product.ratingCount)})</span> : null}
            </>
          ) : (
            <span>No ratings yet</span>
          )}
          {product.salesCount ? (
            <>
              <span className="size-0.5 rounded-full bg-border" />
              <span>{formatCompact(product.salesCount)} sold</span>
            </>
          ) : null}
        </div>

        {product.vendorName ? (
          <span className="flex items-center gap-1 text-[11px] text-faint">
            <Store className="size-3" strokeWidth={2} />
            <span className="line-clamp-1">{product.vendorName}</span>
          </span>
        ) : null}

        <div className="mt-auto pt-1">
          <Price
            pricePaisa={product.pricePaisa}
            comparePaisa={product.comparePaisa}
            size="md"
          />
        </div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="flex flex-col gap-2 p-3.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}
