"use client";

import Link from "next/link";
import { ChevronRight, PackageCheck, Star, MessageSquareText } from "lucide-react";
import { useOrders } from "@/lib/api/orders";
import { formatDate, formatPaisa } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaImage } from "@/components/ui/media-image";
import { ApiError } from "@/lib/api/http";
import type { OrderListItem } from "@/lib/api/types";

function OrderRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <Skeleton className="size-16 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-9 w-24 rounded-lg" />
    </div>
  );
}

function OrderReviewRow({ order }: { order: OrderListItem }) {
  const { summary } = order;
  const itemLabel = summary.itemCount === 1 ? "1 item" : `${summary.itemCount} items`;
  const vendors = summary.vendorNames.filter(Boolean);

  return (
    <Link
      href={`/account/orders/${order.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40 hover:bg-blue-soft/30"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        <MediaImage
          mediaId={summary.firstThumbnailMediaId}
          variant="card"
          alt={`Order ${order.orderNumber}`}
          className="size-full"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-display text-sm font-extrabold text-ink">
            #{order.orderNumber}
          </span>
          <Badge variant="muted" size="sm">
            {itemLabel}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-sub">
          {vendors.length > 0 ? vendors.join(", ") : "Your order"} · Placed{" "}
          {formatDate(order.placedAt)}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-ink">
          {formatPaisa(order.grandTotalPaisa)}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary sm:flex">
        Review items
        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </div>
      <ChevronRight className="size-5 shrink-0 text-faint sm:hidden" />
    </Link>
  );
}

export default function MyReviewsPage() {
  const { data: orders, isLoading, isError, error, refetch } = useOrders({ limit: 50 });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-extrabold text-ink">My reviews</h1>
        <p className="text-sm text-sub">
          Share your experience on delivered items to help other shoppers.
        </p>
      </header>

      {/* Explainer card */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-blue-deep to-navy text-white shadow-[var(--shadow-card)]">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-accent">
            <Star className="size-6 fill-current" strokeWidth={1.6} />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="font-display text-lg font-extrabold">
              Review your delivered orders
            </h2>
            <p className="text-sm text-white/80">
              Open any recent order below to rate and review the items you received.
              Reviews are verified against your purchase, so they only appear on orders
              you&apos;ve actually placed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent orders to review */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <PackageCheck className="size-5 text-primary" />
          <h2 className="font-display text-lg font-extrabold text-ink">
            Waiting for your review
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <OrderRowSkeleton />
            <OrderRowSkeleton />
            <OrderRowSkeleton />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<PackageCheck className="size-7" />}
            title="Couldn't load your orders"
            description={
              error instanceof ApiError
                ? error.message
                : "Something went wrong. Please try again."
            }
            action={
              <Button variant="outline" onClick={() => void refetch()}>
                Retry
              </Button>
            }
          />
        ) : !orders || orders.length === 0 ? (
          <EmptyState
            icon={<PackageCheck className="size-7" />}
            title="No orders to review yet"
            description="Once your orders are delivered, you can rate and review the items here."
            action={
              <Button asChild variant="accent">
                <Link href="/">Start shopping</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderReviewRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      {/* Published reviews note */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-5 text-primary" />
          <h2 className="font-display text-lg font-extrabold text-ink">
            Published reviews
          </h2>
        </div>
        <Card className="border-dashed bg-muted/40">
          <CardContent className="flex flex-col items-start gap-2 p-6">
            <p className="text-sm text-sub">
              Your published reviews appear on each product&apos;s page, alongside
              other shoppers&apos; ratings. There&apos;s no separate list here, but you
              can always revisit a product to see your review live.
            </p>
            <Button asChild variant="ghost" size="sm" className="px-0 text-primary">
              <Link href="/account/orders">View all orders</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
