"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Check,
  ChevronLeft,
  CircleDot,
  PackageX,
  Truck,
} from "lucide-react";
import { useCancelOrder, useOrder, useOrderTracking } from "@/lib/api/orders";
import {
  SUBORDER_STATUS,
  STATUS_TONE_CLASS,
  TRACKING_STEPS,
  currentStepIndex,
  canCustomerCancel,
} from "@/lib/order-status";
import { formatDate, formatDateTime, formatPaisa } from "@/lib/format";
import { ApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaImage } from "@/components/ui/media-image";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  HydratedSubOrder,
  OrderItem,
  OrderView,
  SubOrderStatus,
  TrackingSubOrder,
} from "@/lib/api/types";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: order,
    isLoading: orderLoading,
    isError: orderError,
    error,
  } = useOrder(id);
  const { data: tracking } = useOrderTracking(id);

  const notFound =
    orderError && error instanceof ApiError && error.status === 404;

  if (orderLoading) {
    return <OrderDetailSkeleton />;
  }

  if (notFound || (orderError && !order)) {
    return (
      <EmptyState
        icon={<PackageX className="size-6" />}
        title="Order not found"
        description="We couldn’t find this order. It may have been removed or the link is incorrect."
        action={
          <Button asChild variant="outline" size="md">
            <Link href="/account/orders">Back to orders</Link>
          </Button>
        }
      />
    );
  }

  if (!order) return null;

  return <OrderDetail order={order} tracking={tracking} />;
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-11 w-32 rounded-md" />
        </div>
      </div>

      {/* Tracking banner */}
      <Skeleton className="h-24 rounded-2xl" />

      {/* Items / sub-orders */}
      <Skeleton className="h-72 rounded-2xl" />

      {/* Totals */}
      <Skeleton className="h-44 rounded-2xl" />
    </div>
  );
}

function OrderDetail({
  order,
  tracking,
}: {
  order: OrderView;
  tracking: ReturnType<typeof useOrderTracking>["data"];
}) {
  const subOrders = order.subOrders;
  const firstSubOrder = subOrders[0];
  const firstStatus = firstSubOrder?.status;
  const isCancelled = !!order.cancelledAt;

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="space-y-4">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 text-sm font-semibold text-sub transition-colors hover:text-primary"
        >
          <ChevronLeft className="size-4" />
          Back to orders
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink">
              {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-sub">
              Placed on {formatDate(order.placedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-faint">
              Order total
            </p>
            <p className="font-display text-xl font-extrabold text-ink">
              {formatPaisa(order.grandTotalPaisa)}
            </p>
          </div>
        </div>
      </div>

      {/* Tracking stepper */}
      {firstStatus && (
        <TrackingStepper status={firstStatus} cancelledAt={order.cancelledAt} />
      )}

      {/* Per-subOrder sections */}
      <div className="space-y-4">
        {subOrders.map((sub) => (
          <SubOrderSection
            key={sub.id}
            sub={sub}
            tracking={tracking?.subOrders.find(
              (t) => t.subOrderNumber === sub.subOrderNumber,
            )}
          />
        ))}
      </div>

      {/* Order summary */}
      <OrderSummary order={order} />

      {/* Cancel */}
      {firstSubOrder && !isCancelled && canCustomerCancel(firstSubOrder.status) && (
        <CancelOrderControl orderId={order.id} orderNumber={order.orderNumber} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tracking stepper                                                    */
/* ------------------------------------------------------------------ */

function TrackingStepper({
  status,
  cancelledAt,
}: {
  status: SubOrderStatus;
  cancelledAt: string | null;
}) {
  const exited = status === "cancelled" || status === "returned" || !!cancelledAt;

  if (exited) {
    const tone = status === "returned" ? "Returned" : "Cancelled";
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red/30 bg-red/5 px-4 py-4 text-red sm:px-5">
        <PackageX className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-display text-sm font-extrabold">Order {tone.toLowerCase()}</p>
          <p className="mt-0.5 text-sm text-sub">
            {cancelledAt
              ? `This order was cancelled on ${formatDate(cancelledAt)}.`
              : `This order has been ${tone.toLowerCase()} and is no longer in transit.`}
          </p>
        </div>
      </div>
    );
  }

  const current = currentStepIndex(status);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-6">
      <ol className="flex items-start">
        {TRACKING_STEPS.map((step, i) => {
          const done = i < current;
          const now = i === current;
          const last = i === TRACKING_STEPS.length - 1;
          return (
            <li key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {/* left connector */}
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    i === 0
                      ? "opacity-0"
                      : done || now
                        ? "bg-primary"
                        : "bg-border",
                  )}
                />
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done
                      ? "border-primary bg-primary text-white"
                      : now
                        ? "border-primary bg-blue-soft text-primary"
                        : "border-border bg-card text-faint",
                  )}
                >
                  {done ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : now ? (
                    <CircleDot className="size-4" />
                  ) : (
                    <span className="size-2 rounded-full bg-current" />
                  )}
                </div>
                {/* right connector */}
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    last ? "opacity-0" : done ? "bg-primary" : "bg-border",
                  )}
                />
              </div>
              <span
                className={cn(
                  "mt-2 px-1 text-center text-[11px] font-semibold leading-tight sm:text-xs",
                  done || now ? "text-ink" : "text-faint",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-order section                                                   */
/* ------------------------------------------------------------------ */

function SubOrderSection({
  sub,
  tracking,
}: {
  sub: HydratedSubOrder;
  tracking: TrackingSubOrder | undefined;
}) {
  const meta = SUBORDER_STATUS[sub.status];
  const toneClass = STATUS_TONE_CLASS[meta.tone];

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-extrabold text-ink">
            {sub.vendorName ?? "Store"}
          </p>
          <p className="text-xs text-faint">{sub.subOrderNumber}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-bold",
            toneClass,
          )}
        >
          <span className="size-2 rounded-full bg-current" />
          {meta.label}
        </span>
      </header>

      {/* Items */}
      <ul className="divide-y divide-border">
        {sub.items.map((item) => (
          <li key={item.id}>
            <OrderItemRow item={item} />
          </li>
        ))}
      </ul>

      {/* Shipment tracking timeline */}
      {tracking?.shipment && tracking.shipment.events.length > 0 && (
        <ShipmentTimeline tracking={tracking} />
      )}
    </section>
  );
}

function OrderItemRow({ item }: { item: OrderItem }) {
  const attrs = item.attributesSnapshot
    ? Object.values(item.attributesSnapshot).filter(Boolean).join(" · ")
    : "";

  const body = (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
        <MediaImage
          src={item.imageUrlSnapshot}
          mediaId={item.thumbnailMediaId}
          variant="thumbnail"
          alt={item.titleSnapshot}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-ink">
          {item.titleSnapshot}
        </p>
        {attrs && <p className="mt-0.5 truncate text-xs text-sub">{attrs}</p>}
        <p className="mt-0.5 text-xs text-faint">Qty {item.quantity}</p>
      </div>
      <p className="shrink-0 text-sm font-extrabold text-ink">
        {formatPaisa(item.lineTotalPaisa)}
      </p>
    </div>
  );

  if (item.productSlug) {
    return (
      <Link
        href={`/products/${item.productSlug}`}
        className="block transition-colors hover:bg-muted/50"
      >
        {body}
      </Link>
    );
  }
  return body;
}

function ShipmentTimeline({ tracking }: { tracking: TrackingSubOrder }) {
  const shipment = tracking.shipment;
  if (!shipment) return null;
  const courier = shipment.legs.find((l) => l.courier)?.courier;
  const events = [...shipment.events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-center gap-2">
        <Truck className="size-4 text-primary" />
        <p className="text-sm font-extrabold text-ink">Shipment updates</p>
        {courier && (
          <span className="text-xs text-sub">· {courier}</span>
        )}
      </div>
      <ol className="space-y-3">
        {events.map((ev, i) => (
          <li key={`${ev.at}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-1 size-2.5 rounded-full",
                  i === 0 ? "bg-primary" : "bg-border",
                )}
              />
              {i < events.length - 1 && (
                <span className="w-px flex-1 bg-border" />
              )}
            </div>
            <div className="-mt-0.5 pb-1">
              <p className="text-sm font-semibold capitalize text-ink">
                {ev.eventType.replace(/_/g, " ")}
              </p>
              {ev.notes && <p className="text-xs text-sub">{ev.notes}</p>}
              <p className="mt-0.5 text-[11px] text-faint">
                {formatDateTime(ev.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order summary                                                       */
/* ------------------------------------------------------------------ */

function OrderSummary({ order }: { order: OrderView }) {
  const hasDiscount = order.discountPaisa && order.discountPaisa !== "0";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <h2 className="mb-3 font-display text-sm font-extrabold text-ink">
        Order summary
      </h2>
      <dl className="space-y-2 text-sm">
        <Row label="Subtotal" value={formatPaisa(order.subtotalPaisa)} />
        <Row
          label="Shipping"
          value={
            order.shippingTotalPaisa && order.shippingTotalPaisa !== "0"
              ? formatPaisa(order.shippingTotalPaisa)
              : "Free"
          }
        />
        {hasDiscount && (
          <Row
            label="Voucher"
            value={`−${formatPaisa(order.discountPaisa)}`}
            valueClassName="text-green"
          />
        )}
      </dl>
      <Separator className="my-3" />
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-extrabold text-ink">
          Grand total
        </span>
        <span className="font-display text-lg font-extrabold text-ink">
          {formatPaisa(order.grandTotalPaisa)}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sub">{label}</dt>
      <dd className={cn("font-semibold text-ink", valueClassName)}>{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cancel order                                                        */
/* ------------------------------------------------------------------ */

function CancelOrderControl({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const cancelOrder = useCancelOrder();

  function handleCancel() {
    cancelOrder.mutate(
      { id: orderId, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success("Order cancelled", {
            description: `${orderNumber} has been cancelled.`,
          });
          setOpen(false);
          setReason("");
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Couldn’t cancel this order. Please try again.",
          );
        },
      },
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Need to cancel?</p>
          <p className="text-xs text-sub">
            You can cancel while the order is still being prepared.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Cancel order
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel order {orderNumber}?</DialogTitle>
            <DialogDescription>
              This can’t be undone. Let us know why you’re cancelling (optional).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label
              htmlFor="cancel-reason"
              className="text-sm font-semibold text-ink"
            >
              Reason
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Ordered by mistake, found a better price…"
              className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </div>

          <DialogFooter>
            <Button
              variant="soft"
              size="md"
              onClick={() => setOpen(false)}
              disabled={cancelOrder.isPending}
            >
              Keep order
            </Button>
            <Button
              variant="destructive"
              size="md"
              loading={cancelOrder.isPending}
              onClick={handleCancel}
            >
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
