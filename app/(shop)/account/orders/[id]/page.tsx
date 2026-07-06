"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, PackageX, PencilLine, Star, Truck } from "lucide-react";
import { useCancelOrder, useOrder, useOrderTracking } from "@/lib/api/orders";
import { useAddresses } from "@/lib/api/account";
import { useMyReviews } from "@/lib/api/reviews";
import {
  SUBORDER_STATUS,
  STATUS_TONE_CLASS,
  canCustomerCancel,
  ORDER_LIST_STATUS_BADGE,
  type OrderListStatus,
} from "@/lib/order-status";
import { OrderTracker } from "@/components/account/order-tracker";
import { WriteReviewDialog } from "@/components/account/write-review-dialog";
import { formatDate, formatDateTime, formatPaisa } from "@/lib/format";
import { ApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaImage } from "@/components/ui/media-image";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  Address,
  HydratedSubOrder,
  MyReview,
  OrderItem,
  OrderView,
  TrackingSubOrder,
} from "@/lib/api/types";

/** Map key for a review, unique per (sub-order, product). */
function reviewKey(subOrderId: string, productId: string): string {
  return `${subOrderId}::${productId}`;
}

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

/** Order-level status for the detail header, from the live sub-orders. */
function deriveViewStatus(order: OrderView): OrderListStatus {
  if (order.cancelledAt) return "cancelled";
  const statuses = order.subOrders.map((s) => s.status);
  if (statuses.length > 0) {
    if (statuses.every((s) => s === "delivered")) return "delivered";
    if (statuses.some((s) => s !== "placed" && s !== "cancelled"))
      return "processing";
  }
  return "placed";
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
  const statusBadge = ORDER_LIST_STATUS_BADGE[deriveViewStatus(order)];

  // The user's own reviews, keyed by (sub-order, product), so each item row can
  // show "Edit review" instead of a second "Review" button once reviewed.
  const { data: myReviews } = useMyReviews();
  const reviewByKey = React.useMemo(() => {
    const map = new Map<string, MyReview>();
    for (const r of myReviews ?? []) {
      map.set(reviewKey(r.subOrderId, r.productId), r);
    }
    return map;
  }, [myReviews]);

  // Best-effort delivery address: resolve the order's shipping address from the
  // user's saved addresses. Omitted gracefully if it's since been deleted.
  const { data: addresses } = useAddresses();
  const shippingAddress = React.useMemo(
    () => (addresses ?? []).find((a) => a.id === order.shippingAddressId) ?? null,
    [addresses, order.shippingAddressId],
  );

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="space-y-4">
        <Link
          href="/account/orders"
          className="hidden w-fit items-center gap-1.5 text-sm font-semibold text-sub transition-colors hover:text-primary lg:inline-flex"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
                {order.orderNumber}
              </h1>
              <Badge variant={statusBadge.variant} size="md">
                {statusBadge.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-sub">
              Placed on {formatDate(order.placedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-11 font-bold uppercase tracking-wide text-faint">
              Order total
            </p>
            <p className="font-display text-xl font-extrabold text-ink">
              {formatPaisa(order.grandTotalPaisa)}
            </p>
          </div>
        </div>
      </div>

      {/* Tracking stepper */}
      {firstSubOrder && firstStatus && (
        <OrderTracker
          status={firstStatus}
          cancelledAt={order.cancelledAt}
          placedAt={order.placedAt}
          orderNumber={order.orderNumber}
          vendorName={firstSubOrder.vendorName}
          itemsCount={firstSubOrder.items.reduce((n, it) => n + it.quantity, 0)}
          tracking={tracking?.subOrders.find(
            (t) => t.subOrderNumber === firstSubOrder.subOrderNumber,
          )}
        />
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
            reviewByKey={reviewByKey}
          />
        ))}
      </div>

      {/* Order summary + delivery address */}
      <div
        className={cn(
          "grid gap-4",
          shippingAddress && "lg:grid-cols-2 lg:items-start",
        )}
      >
        <OrderSummary order={order} />
        {shippingAddress && <DeliveryAddressCard address={shippingAddress} />}
      </div>

      {/* Cancel */}
      {firstSubOrder && !isCancelled && canCustomerCancel(firstSubOrder.status) && (
        <CancelOrderControl orderId={order.id} orderNumber={order.orderNumber} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-order section                                                   */
/* ------------------------------------------------------------------ */

function SubOrderSection({
  sub,
  tracking,
  reviewByKey,
}: {
  sub: HydratedSubOrder;
  tracking: TrackingSubOrder | undefined;
  reviewByKey: Map<string, MyReview>;
}) {
  const meta = SUBORDER_STATUS[sub.status];
  const toneClass = STATUS_TONE_CLASS[meta.tone];
  const delivered = sub.status === "delivered";
  const [reviewItem, setReviewItem] = React.useState<OrderItem | null>(null);

  const reviewFor = (item: OrderItem) =>
    reviewByKey.get(reviewKey(sub.id, item.productId)) ?? null;
  // Once every item in a delivered sub-order is reviewed, swap the "tell other
  // shoppers" nudge for a gentler "thanks, you can still edit" note.
  const allReviewed =
    delivered && sub.items.length > 0 && sub.items.every((it) => !!reviewFor(it));

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface/60 px-4 py-3 sm:px-5">
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

      {/* Delivered nudge */}
      {delivered && (
        <div className="flex items-center gap-2.5 border-b border-line bg-amber-soft px-4 py-2.5 sm:px-5">
          <Star className="size-4 shrink-0 fill-amber-deep text-amber-deep" />
          <p className="text-13 font-semibold text-amber-deep">
            {allReviewed
              ? "Thanks for reviewing — you can edit your reviews anytime."
              : "Delivered — tell other shoppers what you think of your items."}
          </p>
        </div>
      )}

      {/* Items */}
      <ul className="divide-y divide-border">
        {sub.items.map((item) => (
          <li key={item.id}>
            <OrderItemRow
              item={item}
              canReview={delivered}
              hasReview={!!reviewFor(item)}
              onReview={() => setReviewItem(item)}
            />
          </li>
        ))}
      </ul>

      {/* Shipment tracking timeline (collapsed by default) */}
      {tracking?.shipment && tracking.shipment.events.length > 0 && (
        <ShipmentTimeline tracking={tracking} />
      )}

      {/* Verified-purchase review dialog (create or edit) */}
      {reviewItem && (
        <WriteReviewDialog
          open
          onOpenChange={(open) => {
            if (!open) setReviewItem(null);
          }}
          productId={reviewItem.productId}
          subOrderId={sub.id}
          productTitle={reviewItem.titleSnapshot}
          existingReview={reviewFor(reviewItem)}
        />
      )}
    </section>
  );
}

function OrderItemRow({
  item,
  canReview,
  hasReview,
  onReview,
}: {
  item: OrderItem;
  canReview: boolean;
  /** True when the user already has a review for this item — show "Edit". */
  hasReview: boolean;
  onReview: () => void;
}) {
  // Reserved "_<Option>Hex" keys carry swatch colors, not display values.
  const attrs = item.attributesSnapshot
    ? Object.entries(item.attributesSnapshot)
        .filter(([key, value]) => value && !key.startsWith("_"))
        .map(([, value]) => value)
        .join(" · ")
    : "";

  const productHref = item.productSlug ? `/product/${item.productSlug}` : null;

  const media = (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
      <MediaImage
        src={item.imageUrlSnapshot}
        mediaId={item.thumbnailMediaId}
        variant="thumbnail"
        alt={item.titleSnapshot}
      />
    </div>
  );

  const info = (
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          "line-clamp-2 text-sm font-semibold text-ink",
          productHref && "transition-colors group-hover/item:text-primary",
        )}
      >
        {item.titleSnapshot}
      </p>
      {attrs && <p className="mt-0.5 truncate text-xs text-sub">{attrs}</p>}
      <p className="mt-0.5 text-xs text-faint">Qty {item.quantity}</p>
    </div>
  );

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5">
      {productHref ? (
        <Link
          href={productHref}
          className="group/item flex min-w-0 flex-1 items-center gap-3"
        >
          {media}
          {info}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {media}
          {info}
        </div>
      )}

      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className="text-sm font-extrabold text-ink">
          {formatPaisa(item.lineTotalPaisa)}
        </p>
        {canReview && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={onReview}
          >
            {hasReview ? (
              <>
                <PencilLine className="size-3.5" />
                Edit review
              </>
            ) : (
              <>
                <Star className="size-3.5" />
                Review
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Raw courier / hub event log for a shipment. The stepper above already
 * summarizes the journey, so this is collapsed by default — it's there for
 * shoppers who want the full audit trail (and for support conversations).
 */
function ShipmentTimeline({ tracking }: { tracking: TrackingSubOrder }) {
  const shipment = tracking.shipment;
  if (!shipment) return null;
  const courier = shipment.legs.find((l) => l.courier)?.courier;
  const events = [...shipment.events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
  const latest = events[0];

  return (
    <Accordion
      type="single"
      collapsible
      className="border-t border-line bg-muted/30"
    >
      <AccordionItem value="shipment" className="border-b-0">
        <AccordionTrigger className="px-4 py-3.5 sm:px-5">
          <span className="flex min-w-0 items-center gap-2">
            <Truck className="size-4 shrink-0 text-primary" />
            <span className="text-sm font-extrabold text-ink">
              Shipment updates
            </span>
            {courier && (
              <span className="text-xs font-medium text-sub">· {courier}</span>
            )}
            {latest && (
              <span className="hidden truncate text-xs font-medium text-faint sm:inline">
                · Latest: {formatEventType(latest.eventType)}
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 sm:px-5">
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
                  <p className="text-sm font-semibold text-ink">
                    {formatEventType(ev.eventType)}
                  </p>
                  {ev.notes && <p className="text-xs text-sub">{ev.notes}</p>}
                  <p className="mt-0.5 text-11 text-faint">
                    {formatDateTime(ev.at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** "dispatched_from_hub" → "Dispatched from hub". */
function formatEventType(eventType: string): string {
  const words = eventType.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* ------------------------------------------------------------------ */
/* Order summary                                                       */
/* ------------------------------------------------------------------ */

function DeliveryAddressCard({ address }: { address: Address }) {
  const line = [
    address.streetAddress,
    address.unionName,
    address.upazila,
    address.district,
    address.postcode,
  ]
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(", ");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-extrabold text-ink">
        <MapPin className="size-4 text-primary" />
        Delivery address
      </h2>
      {address.label ? (
        <span className="mb-1.5 inline-flex rounded-full bg-muted px-2 py-0.5 text-2xs font-bold text-sub">
          {address.label}
        </span>
      ) : null}
      <p className="text-sm font-bold text-ink">
        {address.recipientName ?? "—"}
        {address.recipientPhone && (
          <span className="font-medium text-sub"> · {address.recipientPhone}</span>
        )}
      </p>
      <p className="mt-1 text-13 leading-relaxed text-sub">{line}</p>
    </div>
  );
}

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
