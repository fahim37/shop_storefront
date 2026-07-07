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
  RichOrderSummary,
  RichProductCard,
} from "@/lib/assistant/types";

/**
 * Renders a message's RichContent: product recommendation cards (image,
 * price, link), order summary rows, and action buttons (links / sign-in /
 * two-phase confirm). Collected server-side from tool results — everything
 * here is backend-authored, so hrefs/prices/ids are trustworthy.
 */

function ProductCardMini({ product }: { product: RichProductCard }) {
  const rating =
    product.ratingAverage != null ? Number(product.ratingAverage) : null;
  return (
    <Link
      href={`/product/${product.slug}`}
      className="flex w-60 shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card p-2 transition-colors hover:border-primary"
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

function OrderSummaryRow({ order }: { order: RichOrderSummary }) {
  return (
    <Link
      href={`/account/orders/${order.orderId}`}
      className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 transition-colors hover:border-primary"
    >
      <Package className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-13 font-bold text-ink">#{order.orderNumber}</p>
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

function ActionButtons({ actions }: { actions: RichAction[] }) {
  const { requireAuth } = useAuth();
  const confirmAction = useAssistantStore((s) => s.confirmAction);
  const consumed = useAssistantStore((s) => s.consumedConfirmIds);

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
        // Two-phase confirm — single-use, disabled once pressed. Expiry is
        // enforced server-side (10-min Redis TTL): a stale press 404s and
        // the store appends an "expired" reply.
        const used = consumed.includes(action.confirmId);
        return (
          <div key={i} className="flex w-full flex-col gap-1.5">
            <p className="text-11 font-semibold text-sub">{action.summary}</p>
            <div className="flex gap-1.5">
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full"
                disabled={used}
                onClick={() => void confirmAction(action.confirmId, "confirm")}
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
          {rich.products!.map((p) => (
            <ProductCardMini key={p.productId} product={p} />
          ))}
        </div>
      ) : null}
      {hasOrders ? (
        <div className="flex flex-col gap-1.5">
          {rich.orders!.map((o) => (
            <OrderSummaryRow key={o.orderId} order={o} />
          ))}
        </div>
      ) : null}
      {hasActions ? <ActionButtons actions={rich.actions!} /> : null}
    </div>
  );
}
