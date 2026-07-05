"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronRight,
  CornerDownRight,
  PackageCheck,
  Star,
  Store,
  MessageSquareText,
} from "lucide-react";
import { useOrders } from "@/lib/api/orders";
import { useMyReviews, useReplyToReview } from "@/lib/api/reviews";
import { formatDate, formatPaisa, formatRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaImage } from "@/components/ui/media-image";
import { RatingStars } from "@/components/ui/rating-stars";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/http";
import type { MyReview, OrderListItem } from "@/lib/api/types";

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

/* -------------------------------------------------------------------------- */
/* Published reviews + conversations                                          */
/* -------------------------------------------------------------------------- */

function ConversationBubble({
  role,
  body,
  createdAt,
}: {
  role: "vendor" | "customer";
  body: string;
  createdAt: string;
}) {
  const isVendor = role === "vendor";
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        isVendor
          ? "border-primary/15 bg-blue-soft/50"
          : "border-border bg-muted/40",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[12px] font-extrabold",
          isVendor ? "text-primary" : "text-sub",
        )}
      >
        {isVendor ? (
          <Store className="size-3.5" strokeWidth={2.4} />
        ) : (
          <CornerDownRight className="size-3.5" strokeWidth={2.4} />
        )}
        {isVendor ? "Seller" : "You"}
        <span className="ml-1 text-[11px] font-semibold text-faint">
          {formatRelative(createdAt)}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-sub">
        {body}
      </p>
    </div>
  );
}

function ReplyForm({ review }: { review: MyReview }) {
  const reply = useReplyToReview(review.productId);
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length < 2) {
      toast.error("Please write a longer reply.");
      return;
    }
    reply.mutate(
      { reviewId: review.id, body: trimmed },
      {
        onSuccess: () => {
          setBody("");
          setOpen(false);
          toast.success("Reply sent", {
            description: "The seller has been notified.",
          });
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't send your reply.",
          ),
      },
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-bold text-sub transition-colors hover:border-primary/40 hover:text-primary"
      >
        <CornerDownRight className="size-3.5" strokeWidth={2.4} /> Reply to seller
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        autoFocus
        placeholder="Write your reply to the seller…"
        className="flex w-full resize-none rounded-[var(--radius)] border border-input bg-muted px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" size="sm" loading={reply.isPending}>
          {reply.isPending ? "Sending…" : "Send reply"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={reply.isPending}
          onClick={() => {
            setOpen(false);
            setBody("");
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function MyReviewCard({ review }: { review: MyReview }) {
  const productHref = review.productSlug
    ? `/products/${review.productSlug}?review=${review.id}#reviews`
    : undefined;
  const hasConversation = !!review.response || review.replies.length > 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        {/* Product + rating header */}
        <div className="flex items-start gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            <MediaImage
              mediaId={review.thumbnailMediaId}
              variant="card"
              alt={review.productTitle ?? "Product"}
              className="size-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            {productHref ? (
              <Link
                href={productHref}
                className="line-clamp-2 text-sm font-extrabold text-ink hover:text-primary"
              >
                {review.productTitle ?? "View product"}
              </Link>
            ) : (
              <span className="line-clamp-2 text-sm font-extrabold text-ink">
                {review.productTitle ?? "Product"}
              </span>
            )}
            <div className="mt-1 flex items-center gap-2">
              <RatingStars value={review.rating} size={14} />
              <span className="text-[11.5px] font-semibold text-faint">
                {formatRelative(review.createdAt)}
                {review.editedAt ? " · Edited" : ""}
              </span>
              {review.status !== "published" && (
                <Badge variant="muted" size="sm">
                  {review.status === "pending_moderation"
                    ? "In review"
                    : review.status}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Review body */}
        {review.title && (
          <h4 className="text-sm font-extrabold text-ink">{review.title}</h4>
        )}
        {review.body && (
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-sub">
            {review.body}
          </p>
        )}

        {/* Conversation */}
        {hasConversation && (
          <div className="space-y-2">
            {review.response && (
              <ConversationBubble
                role="vendor"
                body={review.response.body}
                createdAt={review.response.createdAt}
              />
            )}
            {review.replies.map((m) => (
              <ConversationBubble
                key={m.id}
                role={m.authorRole}
                body={m.body}
                createdAt={m.createdAt}
              />
            ))}
          </div>
        )}

        {/* Reply — only once the seller has responded */}
        {review.response && <ReplyForm review={review} />}
      </CardContent>
    </Card>
  );
}

function PublishedReviews() {
  const { data, isLoading, isError, error, refetch } = useMyReviews();

  // Show reviews the buyer has actually written (any live status), newest first.
  const reviews = React.useMemo(
    () =>
      (data ?? [])
        .filter((r) => r.status !== "rejected")
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<MessageSquareText className="size-7" />}
        title="Couldn't load your reviews"
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
    );
  }

  if (reviews.length === 0) {
    return (
      <Card className="border-dashed bg-muted/40">
        <CardContent className="p-6">
          <p className="text-sm text-sub">
            You haven&apos;t written any reviews yet. Once your orders are
            delivered, rate the items above — your reviews and any seller replies
            will show here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <MyReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}

export default function MyReviewsPage() {
  const { data: orders, isLoading, isError, error, refetch } = useOrders({ limit: 50 });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-xl font-extrabold text-ink sm:text-2xl">My reviews</h1>
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

      {/* Published reviews + seller conversations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-5 text-primary" />
          <h2 className="font-display text-lg font-extrabold text-ink">
            Your reviews &amp; replies
          </h2>
        </div>
        <PublishedReviews />
      </section>
    </div>
  );
}
