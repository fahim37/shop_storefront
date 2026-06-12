"use client";

import Link from "next/link";
import { PackageOpen, ShoppingBag } from "lucide-react";
import { useOrders } from "@/lib/api/orders";
import { formatDate, formatPaisa } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaImage } from "@/components/ui/media-image";
import type { OrderListItem } from "@/lib/api/types";

export default function OrdersPage() {
  const { data: orders, isLoading, isError } = useOrders({ limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">
          Order history
        </h1>
        <p className="mt-1 text-sm text-sub">
          Track, review and re-order from your past purchases.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sub">
          <Spinner className="size-5 text-primary" />
          <span className="text-sm">Loading your orders…</span>
        </div>
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

function OrderGroupCard({ order }: { order: OrderListItem }) {
  const isCancelled = !!order.cancelledAt;
  const detailHref = `/account/orders/${order.id}`;
  const vendorNames = order.summary.vendorNames.filter(Boolean);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-colors hover:border-primary/30">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-faint">
            Order
          </p>
          <p className="truncate font-display text-sm font-extrabold text-ink">
            {order.orderNumber}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wide text-faint">
            Placed on
          </p>
          <p className="text-sm font-semibold text-sub">
            {formatDate(order.placedAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wide text-faint">
            Total
          </p>
          <p className="text-sm font-extrabold text-ink">
            {formatPaisa(order.grandTotalPaisa)}
          </p>
        </div>
        <div>
          {isCancelled ? (
            <Badge variant="sale" size="md">
              Cancelled
            </Badge>
          ) : (
            <Badge variant="muted" size="md">
              Processing
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          <MediaImage
            mediaId={order.summary.firstThumbnailMediaId}
            variant="thumbnail"
            alt={`Items in order ${order.orderNumber}`}
          />
        </div>

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
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button asChild variant="soft" size="sm">
            <Link href={detailHref}>View details</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={detailHref}>Track order</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
