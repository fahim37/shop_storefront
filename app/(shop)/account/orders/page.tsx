"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  PackageOpen,
  ShoppingBag,
  Star,
  Truck,
  XCircle,
} from "lucide-react";
import { useOrders } from "@/lib/api/orders";
import { formatDate, formatPaisa } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaImage } from "@/components/ui/media-image";
import {
  TRACKING_STEPS,
  currentStepIndex,
  deriveOrderListStatus,
  ORDER_LIST_STATUS_BADGE,
  type OrderListStatus,
} from "@/lib/order-status";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "@/lib/api/types";

export default function OrdersPage() {
  const { data: orders, isLoading, isError } = useOrders({ limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
          Order history
        </h1>
        <p className="mt-1 text-sm text-sub">
          Track, review and re-order from your past purchases.
        </p>
      </div>

      {isLoading ? (
        <ul className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <OrderGroupCardSkeleton />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <EmptyState
          icon={<PackageOpen className="size-6" />}
          title="Couldn’t load your orders"
          description="Something went wrong while fetching your order history. Please try again."
        />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-6" />}
          title="No orders yet"
          description="When you place an order it will show up here so you can track it."
          action={
            <Button asChild variant="accent" size="md">
              <Link href="/">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderGroupCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderGroupCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/60 px-4 py-3 sm:px-5">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <Skeleton className="size-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
        <div className="space-y-1.5 sm:text-right">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Icon shown inside the status pill on each order card. */
const STATUS_ICON: Record<OrderListStatus, React.ReactNode> = {
  delivered: <CheckCircle2 className="size-3.5" />,
  processing: <Truck className="size-3.5" />,
  placed: <Clock3 className="size-3.5" />,
  cancelled: <XCircle className="size-3.5" />,
};

/**
 * How far along the least-progressed (non-cancelled) shipment is, as an
 * index into TRACKING_STEPS — the honest "your order is at least here"
 * signal for the mini progress rail. Null when nothing is in flight.
 */
function minTrackingStep(order: OrderListItem): number | null {
  const steps = (order.summary.subOrderStatuses ?? [])
    .filter((s) => s !== "cancelled" && s !== "returned")
    .map((s) => currentStepIndex(s))
    .filter((i) => i >= 0);
  return steps.length > 0 ? Math.min(...steps) : null;
}

function OrderGroupCard({ order }: { order: OrderListItem }) {
  const detailHref = `/account/orders/${order.id}`;
  const vendorNames = order.summary.vendorNames.filter(Boolean);
  const status = deriveOrderListStatus(order);
  const statusBadge = ORDER_LIST_STATUS_BADGE[status];
  const step = status === "processing" ? minTrackingStep(order) : null;

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-pop)]">
      {/* Header: order number + date | status */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-surface/60 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <Link
            href={detailHref}
            className="block truncate font-display text-sm font-extrabold text-ink transition-colors hover:text-primary"
          >
            {order.orderNumber}
          </Link>
          <p className="mt-0.5 text-xs font-medium text-sub">
            Placed {formatDate(order.placedAt)}
          </p>
        </div>
        <Badge variant={statusBadge.variant} size="lg" className="gap-1.5">
          {STATUS_ICON[status]}
          {statusBadge.label}
        </Badge>
      </header>

      {/* Body: thumbnail · items/vendor · total · actions */}
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <Link
          href={detailHref}
          className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
        >
          <MediaImage
            mediaId={order.summary.firstThumbnailMediaId}
            variant="thumbnail"
            alt={`Items in order ${order.orderNumber}`}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {order.summary.itemCount}{" "}
            {order.summary.itemCount === 1 ? "item" : "items"}
            {order.summary.subOrderCount > 1
              ? ` · ${order.summary.subOrderCount} shipments`
              : ""}
          </p>
          {vendorNames.length > 0 && (
            <p className="mt-0.5 truncate text-sm text-sub">
              {vendorNames.join(", ")}
            </p>
          )}

          {/* Mini progress rail for in-flight orders */}
          {step !== null && (
            <div className="mt-2 flex max-w-xs items-center gap-2">
              <div className="flex flex-1 gap-1">
                {TRACKING_STEPS.map((s, i) => (
                  <span
                    key={s.key}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i <= step ? "bg-accent" : "bg-line",
                    )}
                  />
                ))}
              </div>
              <span className="whitespace-nowrap text-11 font-semibold text-sub">
                {TRACKING_STEPS[step].label}
              </span>
            </div>
          )}
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-11 font-bold uppercase tracking-wide text-faint">
            Total
          </p>
          <p className="font-display text-base font-extrabold text-ink">
            {formatPaisa(order.grandTotalPaisa)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {status === "delivered" ? (
            <Button asChild variant="outline" size="sm">
              <Link href={detailHref}>
                <Star className="size-4" />
                Review items
              </Link>
            </Button>
          ) : status !== "cancelled" ? (
            <Button asChild variant="outline" size="sm">
              <Link href={detailHref}>
                <Truck className="size-4" />
                Track order
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="soft" size="sm">
            <Link href={detailHref}>View details</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
