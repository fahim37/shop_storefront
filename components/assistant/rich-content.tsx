"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronRight, LogIn, Package, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/ui/price";
import { useAuth } from "@/lib/auth/auth-context";
import { useAssistantStore } from "@/lib/assistant/use-assistant-store";
import { formatPaisa, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  RichAction,
  RichContent,
  RichOrderItemPreview,
  RichOrderSummary,
  RichProductCard,
} from "@/lib/assistant/types";

/**
 * Renders a message's RichContent: product recommendation cards (image,
 * price, link), order summary rows, and action buttons (links / sign-in /
 * two-phase confirm). Collected server-side from tool results — everything
 * here is backend-authored, so hrefs/prices/ids are trustworthy.
 */

function ProductCardMini({
  product,
  index = 0,
}: {
  product: RichProductCard;
  index?: number;
}) {
  const rating =
    product.ratingAverage != null ? Number(product.ratingAverage) : null;
  return (
    <Link
      href={`/product/${product.slug}`}
      style={{ animationDelay: `${index * 60}ms` }}
      className="flex w-60 shrink-0 animate-pop items-center gap-2.5 rounded-xl border border-border bg-card p-2 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-card)] motion-reduce:animate-none"
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        <MediaImage
          mediaId={product.thumbnailMediaId}
          variant="card"
          alt={product.title}
          className="size-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-13 font-semibold leading-snug text-ink">
          {product.title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Price
            pricePaisa={product.pricePaisa}
            comparePaisa={product.comparePaisa}
            size="sm"
          />
          {rating != null && rating > 0 ? (
            <span className="flex items-center gap-0.5 text-11 font-semibold text-faint">
              <Star className="size-3 fill-amber text-amber" /> {rating.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </Link>
  );
}

/** Overlapping stack of up to 3 item thumbnails — "what's inside" at a glance. */
function OrderItemThumbs({ items }: { items: RichOrderItemPreview[] }) {
  return (
    <div className="flex shrink-0 -space-x-2.5">
      {items.slice(0, 3).map((item, i) => (
        <div
          key={i}
          className="relative size-10 overflow-hidden rounded-lg border-2 border-card bg-muted shadow-sm"
          style={{ zIndex: items.length - i }}
        >
          <MediaImage
            mediaId={item.thumbnailMediaId}
            variant="thumbnail"
            alt={item.title}
            className="size-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

/** "Blender ×2, Cotton T-Shirt +3 more" — compact contents line. */
function orderItemsLine(order: RichOrderSummary): string | null {
  const items = order.items;
  if (!items?.length) return null;
  const names = items.map((it) =>
    it.quantity > 1 ? `${it.title} ×${it.quantity}` : it.title,
  );
  const shownQty = items.reduce((n, it) => n + it.quantity, 0);
  const more = (order.itemCount ?? shownQty) - shownQty;
  return names.join(", ") + (more > 0 ? ` +${more} more` : "");
}

function OrderSummaryRow({
  order,
  index = 0,
}: {
  order: RichOrderSummary;
  index?: number;
}) {
  const itemsText = orderItemsLine(order);
  return (
    <Link
      href={`/account/orders/${order.orderId}`}
      style={{ animationDelay: `${index * 60}ms` }}
      className="flex animate-fade-up items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-card)] motion-reduce:animate-none"
    >
      {order.items?.length ? (
        <OrderItemThumbs items={order.items} />
      ) : (
        <Package className="size-4 shrink-0 text-primary" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-13 font-bold text-ink">#{order.orderNumber}</p>
        {itemsText ? (
          <p className="truncate text-11 font-medium text-ink/75" title={itemsText}>
            {itemsText}
          </p>
        ) : null}
        <p className="text-11 font-medium text-sub">
          {order.itemCount ? `${order.itemCount} item${order.itemCount > 1 ? "s" : ""} · ` : ""}
          {formatRelative(order.placedAt)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={cn(
            "inline-block rounded-full px-2 py-0.5 text-2xs font-extrabold uppercase tracking-wide",
            order.status === "cancelled"
              ? "bg-red/10 text-red"
              : order.status === "delivered"
                ? "bg-green/10 text-green"
                : "bg-blue-soft text-primary",
          )}
        >
          {order.status.replaceAll("_", " ")}
        </span>
        <p className="mt-0.5 text-13 font-extrabold text-ink">
          {formatPaisa(order.totalPaisa)}
        </p>
      </div>
    </Link>
  );
}

/**
 * Two-phase confirm — single-use, disabled once pressed. Expiry is enforced
 * server-side (10-min Redis TTL): a stale press 404s and the store appends
 * an "expired" reply. When the backend attaches `reasonOptions` (order
 * cancellation), a why-questionnaire gates the Confirm button — the chosen
 * reason is stored on the order and shows up in the admin dashboard.
 */
function ConfirmActionBlock({
  action,
}: {
  action: Extract<RichAction, { type: "confirm" }>;
}) {
  const confirmAction = useAssistantStore((s) => s.confirmAction);
  const consumed = useAssistantStore((s) => s.consumedConfirmIds);
  const [reasonCode, setReasonCode] = React.useState<string | null>(null);

  const used = consumed.includes(action.confirmId);
  const needsReason = Boolean(action.reasonOptions?.length);
  const confirmDisabled = used || (needsReason && !reasonCode);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <p className="text-11 font-semibold text-sub">{action.summary}</p>
      {needsReason ? (
        <div className="flex flex-col gap-1">
          <p className="text-11 font-bold text-ink">Mind telling us why?</p>
          <div className="flex flex-wrap gap-1">
            {action.reasonOptions!.map((r) => {
              const selected = reasonCode === r.code;
              return (
                <button
                  key={r.code}
                  type="button"
                  disabled={used}
                  onClick={() => setReasonCode(selected ? null : r.code)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-11 font-semibold transition-all duration-150 active:scale-95 disabled:opacity-50",
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-sub hover:border-primary hover:text-ink",
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex gap-1.5">
        <Button
          variant="destructive"
          size="sm"
          className="rounded-full"
          disabled={confirmDisabled}
          title={confirmDisabled && !used ? "Pick a reason first" : undefined}
          onClick={() =>
            void confirmAction(action.confirmId, "confirm", reasonCode ?? undefined)
          }
        >
          <Check className="size-3.5" /> {action.label}
        </Button>
        <Button
          variant="soft"
          size="sm"
          className="rounded-full"
          disabled={used}
          onClick={() => void confirmAction(action.confirmId, "cancel")}
        >
          <X className="size-3.5" /> No, don&apos;t
        </Button>
      </div>
    </div>
  );
}

function ActionButtons({ actions }: { actions: RichAction[] }) {
  const { requireAuth } = useAuth();

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action, i) => {
        if (action.type === "link") {
          return (
            <Button key={i} asChild variant="outline" size="sm" className="rounded-full">
              <Link href={action.href}>
                {action.label} <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          );
        }
        if (action.type === "signin") {
          return (
            <Button
              key={i}
              variant="primary"
              size="sm"
              className="rounded-full"
              onClick={() => requireAuth(() => undefined)}
            >
              <LogIn className="size-3.5" /> {action.label}
            </Button>
          );
        }
        return <ConfirmActionBlock key={action.confirmId} action={action} />;
      })}
    </div>
  );
}

export function RichContentBlock({ rich }: { rich: RichContent }) {
  const hasProducts = Boolean(rich.products?.length);
  const hasOrders = Boolean(rich.orders?.length);
  const hasActions = Boolean(rich.actions?.length);
  if (!hasProducts && !hasOrders && !hasActions) return null;

  return (
    <div className="mt-1.5 flex w-full max-w-full flex-col gap-2">
      {hasProducts ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {rich.products!.map((p, i) => (
            <ProductCardMini key={p.productId} product={p} index={i} />
          ))}
        </div>
      ) : null}
      {hasOrders ? (
        <div className="flex flex-col gap-1.5">
          {rich.orders!.map((o, i) => (
            <OrderSummaryRow key={o.orderId} order={o} index={i} />
          ))}
        </div>
      ) : null}
      {hasActions ? <ActionButtons actions={rich.actions!} /> : null}
    </div>
  );
}
