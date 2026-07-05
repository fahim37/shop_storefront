"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  CornerDownRight,
  HelpCircle,
  MessageSquareQuote,
  MessagesSquare,
  PencilLine,
  Star,
  Store,
  ThumbsUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Field } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaImage } from "@/components/ui/media-image";
import { RatingStars } from "@/components/ui/rating-stars";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/http";
import { resolveMediaPath } from "@/lib/media";
import { formatRating, formatRelative, initials } from "@/lib/format";
import {
  REVIEWS_PAGE_SIZE,
  useAskQuestion,
  useInfiniteProductReviews,
  useProductQuestions,
  useReplyToReview,
  useReviewHelpful,
} from "@/lib/api/reviews";
import { useAuth } from "@/lib/auth/auth-context";
import type {
  ProductCardRow,
  Question,
  Review,
  ReviewReplyMessage,
  ReviewSort,
} from "@/lib/api/types";

export interface ReviewsSectionProps {
  product: ProductCardRow;
  /**
   * Description sanitized on the server (see `renderDescriptionHtml`), or null
   * for a legacy plain-text description. Sanitizing server-side keeps the
   * (jsdom-free) parser out of the client bundle.
   */
  descriptionHtml?: string | null;
}

/**
 * Stacked PDP detail sections — Description / Specifications / Reviews /
 * Questions, all visible on the page (no tabs) so everything is scannable and
 * deep-linkable (`#reviews`, `#questions`).
 */
export function ProductDetailSections({
  product,
  descriptionHtml,
}: ReviewsSectionProps) {
  const attributeEntries = React.useMemo(
    () => specEntries(product.attributes),
    [product.attributes],
  );

  return (
    <div className="flex flex-col gap-8 sm:gap-12">
      <DetailSection id="description" title="Description">
        <DescriptionTab product={product} descriptionHtml={descriptionHtml} />
      </DetailSection>

      {attributeEntries.length > 0 && (
        <DetailSection id="specifications" title="Specifications">
          <SpecificationsTab entries={attributeEntries} />
        </DetailSection>
      )}

      <DetailSection id="reviews" title="Ratings & reviews">
        <ReviewsTab product={product} />
      </DetailSection>

      <DetailSection id="questions" title="Questions & answers">
        <QuestionsTab productId={product.id} />
      </DetailSection>
    </div>
  );
}

/** Section heading with a hairline rule — a clear divider between blocks. */
function DetailSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex items-center gap-3 sm:mb-5">
        <h2 className="font-display text-lg font-extrabold tracking-tight sm:text-[22px]">
          {title}
        </h2>
        <span className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------------- */
/* Description                                                             */
/* ----------------------------------------------------------------------- */

function DescriptionTab({
  product,
  descriptionHtml,
}: {
  product: ProductCardRow;
  descriptionHtml?: string | null;
}) {
  const text = product.description?.trim();
  if (!text) {
    return (
      <p className="text-sm leading-relaxed text-sub">
        The seller has not added a detailed description for{" "}
        <span className="font-bold text-ink">{product.title}</span> yet. Check
        the specifications tab or ask a question below.
      </p>
    );
  }
  // Rich-text descriptions arrive pre-sanitized from the server (see
  // renderDescriptionHtml); legacy plain-text keeps its pre-wrapped rendering.
  if (descriptionHtml) {
    return (
      <div
        className="rte-content max-w-3xl text-[14.5px] leading-relaxed text-sub"
        // Server-sanitized with a strict allowlist (see lib/sanitize).
        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
      />
    );
  }
  return (
    <div className="max-w-3xl whitespace-pre-line text-[14.5px] leading-relaxed text-sub">
      {text}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Specifications                                                         */
/* ----------------------------------------------------------------------- */

function specEntries(
  attributes: Record<string, unknown>,
): Array<[string, string]> {
  return Object.entries(attributes ?? {})
    .map(([key, value]): [string, string] => [key, formatSpecValue(value)])
    .filter(([, value]) => value.length > 0);
}

function formatSpecValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map((v) => formatSpecValue(v)).filter(Boolean).join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return "";
  return String(value).trim();
}

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function SpecificationsTab({ entries }: { entries: Array<[string, string]> }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-sub">No specifications listed.</p>
    );
  }
  return (
    <dl className="grid max-w-3xl grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
      {entries.map(([key, value], i) => (
        <div
          key={key}
          className={cn(
            "flex items-start justify-between gap-4 border-b border-border py-2.5 text-[13.5px]",
            i < 2 && "border-t sm:border-t-0",
          )}
        >
          <dt className="font-bold text-faint">{humanizeKey(key)}</dt>
          <dd className="text-right font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------------------- */
/* Reviews                                                                */
/* ----------------------------------------------------------------------- */

const REVIEW_SORTS: Array<{ value: ReviewSort; label: string }> = [
  { value: "recent", label: "Newest first" },
  { value: "helpful", label: "Most helpful" },
  { value: "rating_desc", label: "Highest rated" },
  { value: "rating_asc", label: "Lowest rated" },
];

function ReviewsTab({ product }: { product: ProductCardRow }) {
  const [sort, setSort] = React.useState<ReviewSort>("recent");
  const [starFilter, setStarFilter] = React.useState<number | null>(null);
  const query = useInfiniteProductReviews(product.id, {
    sort,
    rating: starFilter ?? undefined,
  });

  const pages = query.data?.pages ?? [];
  const reviews = pages.flatMap((p) => p.reviews);
  const summary = pages[0];

  // Deep-link target: /product/[slug]?review=<id>#reviews arrives here from the
  // "seller replied to your review" notification. Read the id on the client
  // (avoids a Suspense boundary for useSearchParams), then auto-load pages until
  // it's loaded and scroll it into view.
  const [targetReviewId] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("review");
  });
  const scrolledRef = React.useRef(false);
  React.useEffect(() => {
    if (!targetReviewId || scrolledRef.current) return;
    if (reviews.some((r) => r.id === targetReviewId)) {
      const el = document.getElementById(`review-${targetReviewId}`);
      if (el) {
        scrolledRef.current = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetReviewId, reviews, query.hasNextPage, query.isFetchingNextPage]);
  const total = summary?.total ?? product.ratingCount;
  const shownCount = starFilter
    ? (summary?.distribution?.[String(starFilter)] ?? reviews.length)
    : total;

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:gap-6">
      <RatingSummaryCard
        product={product}
        distribution={summary?.distribution}
        total={total}
        activeStar={starFilter}
        onToggleStar={(star) =>
          setStarFilter((cur) => (cur === star ? null : star))
        }
      />

      {/* Review list */}
      <div className="min-w-0">
        {/* Toolbar: count / active filter + sort */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            {starFilter ? (
              <>
                <span>
                  {shownCount} {starFilter}-star{" "}
                  {shownCount === 1 ? "review" : "reviews"}
                </span>
                <button
                  type="button"
                  onClick={() => setStarFilter(null)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[11.5px] font-bold text-sub transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <X className="size-3" strokeWidth={2.5} /> Clear
                </button>
              </>
            ) : (
              <span>
                {total} {total === 1 ? "review" : "reviews"}
              </span>
            )}
          </div>
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as ReviewSort)}
          >
            <SelectTrigger
              aria-label="Sort reviews"
              className="h-9 w-[160px] text-[13px] font-semibold"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {REVIEW_SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {query.isLoading ? (
          <ReviewListSkeleton />
        ) : query.isError ? (
          <EmptyState
            icon={<Star className="size-6" />}
            title="Couldn't load reviews"
            description="Please try again in a moment."
          />
        ) : reviews.length === 0 ? (
          starFilter ? (
            <EmptyState
              icon={<Star className="size-6" />}
              title={`No ${starFilter}-star reviews`}
              description="Try a different rating, or view all reviews."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStarFilter(null)}
                >
                  Show all reviews
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<MessageSquareQuote />}
              title="No reviews yet"
              description="Be the first to review this product after your order is delivered."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/account/orders">Go to my orders</Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="flex flex-col gap-4 sm:gap-5">
              {reviews.map((rv) => (
                <ReviewItem
                  key={rv.id}
                  review={rv}
                  productId={product.id}
                  highlight={rv.id === targetReviewId}
                />
              ))}
            </ul>

            {/* View more / end of list */}
            {query.hasNextPage ? (
              <div className="mt-5 flex justify-center">
                <Button
                  variant="outline"
                  size="md"
                  className="min-w-48"
                  loading={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  View more reviews
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            ) : reviews.length > REVIEWS_PAGE_SIZE ? (
              <p className="mt-5 text-center text-xs font-semibold text-faint">
                You&apos;ve seen all {shownCount}{" "}
                {shownCount === 1 ? "review" : "reviews"}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Daraz-style rating summary: big average, star histogram (each row doubles
 * as a filter toggle), and the write-review CTA.
 */
function RatingSummaryCard({
  product,
  distribution,
  total,
  activeStar,
  onToggleStar,
}: {
  product: ProductCardRow;
  distribution: Record<string, number> | undefined;
  total: number;
  activeStar: number | null;
  onToggleStar: (star: number) => void;
}) {
  return (
    <Card className="h-fit lg:sticky lg:top-24">
      <CardContent className="flex flex-col gap-4 py-5 sm:py-6">
        {/* Average */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-end justify-center gap-1">
            <span className="font-display text-4xl font-extrabold leading-none sm:text-5xl">
              {formatRating(product.ratingAverage)}
            </span>
            <span className="pb-0.5 text-sm font-bold text-faint">/5</span>
          </div>
          <RatingStars value={product.ratingAverage} size={18} precise />
          <span className="text-[12.5px] font-bold text-faint">
            {total} {total === 1 ? "rating" : "ratings"}
          </span>
        </div>

        {/* Star histogram — rows toggle the star filter */}
        <div className="flex flex-col gap-0.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = distribution?.[String(star)] ?? 0;
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            const active = activeStar === star;
            const disabled = n === 0 && !active;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onToggleStar(star)}
                disabled={disabled}
                aria-pressed={active}
                title={
                  disabled
                    ? `No ${star}-star reviews`
                    : `Show only ${star}-star reviews`
                }
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-blue-soft ring-1 ring-primary/30"
                    : "hover:bg-muted",
                  disabled && "cursor-default opacity-45 hover:bg-transparent",
                )}
              >
                <span className="flex w-8 shrink-0 items-center justify-end gap-0.5 text-[12px] font-bold text-sub">
                  {star}
                  <Star className="size-3 shrink-0 fill-amber-deep text-amber-deep" />
                </span>
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-border/60">
                  <span
                    className="block h-full rounded-full bg-amber-deep transition-[width] duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-[11.5px] font-bold tabular-nums text-faint">
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        <Separator />

        {/* Write-review CTA */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-[12.5px] leading-relaxed text-sub">
            Only verified buyers can review. Bought this?
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/account/orders">
              <PencilLine className="size-4" /> Write a review
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewItem({
  review,
  productId,
  highlight = false,
}: {
  review: Review;
  productId: string;
  /** Deep-link target (from the "seller replied" notification) — ring it. */
  highlight?: boolean;
}) {
  const { user } = useAuth();
  const helpful = useReviewHelpful(productId);
  const [bumped, setBumped] = React.useState(false);
  const helpfulCount = review.helpfulCount + (bumped ? 1 : 0);

  // The author can reply back once the seller has responded.
  const isAuthor = !!user && user.id === review.userId;
  const canReply = isAuthor && !!review.response;

  const markHelpful = () => {
    if (bumped || helpful.isPending) return;
    setBumped(true);
    helpful.mutate(
      { reviewId: review.id, isHelpful: true },
      {
        onError: (err) => {
          setBumped(false);
          toast.error(
            err instanceof ApiError ? err.message : "Couldn't record that.",
          );
        },
      },
    );
  };

  return (
    <li
      id={`review-${review.id}`}
      className={cn(
        "scroll-mt-24 rounded-2xl border bg-card p-4 transition-colors sm:p-5",
        highlight ? "border-primary/50 ring-2 ring-primary/25" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          {review.reviewerPhotoUrl && (
            <AvatarImage
              src={resolveMediaPath(review.reviewerPhotoUrl) ?? undefined}
              alt=""
            />
          )}
          <AvatarFallback>{initials(review.reviewerName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-extrabold text-ink">
              {review.reviewerName ?? "Verified buyer"}
            </span>
            <Badge variant="success" size="sm">
              <CheckCircle2 className="size-3" strokeWidth={2.4} /> Verified
              purchase
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <RatingStars value={review.rating} size={14} />
            <span className="text-[11.5px] font-semibold text-faint">
              {formatRelative(review.createdAt)}
              {review.editedAt ? " · Edited" : ""}
            </span>
          </div>
        </div>
      </div>

      {review.title && (
        <h4 className="mt-3 text-sm font-extrabold text-ink">
          {review.title}
        </h4>
      )}
      {review.body && (
        <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-sub">
          {review.body}
        </p>
      )}

      {review.media.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.media.map((m) => (
            <a
              key={m.id}
              href={
                resolveMediaPath(m.url.replace("/card", "/original")) ??
                undefined
              }
              target="_blank"
              rel="noreferrer"
              title="View full size"
              className="block size-20 overflow-hidden rounded-lg border border-border bg-muted transition-opacity hover:opacity-85"
            >
              <MediaImage src={m.url} alt="Review photo" />
            </a>
          ))}
        </div>
      )}

      {review.response && (
        <ReviewConversation
          review={review}
          productId={productId}
          canReply={canReply}
          reviewerName={review.reviewerName}
        />
      )}

      <button
        type="button"
        onClick={markHelpful}
        disabled={bumped || helpful.isPending}
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] font-bold transition-colors",
          bumped
            ? "border-primary/40 bg-blue-soft text-primary"
            : "text-sub hover:border-primary/40 hover:text-primary",
        )}
      >
        <ThumbsUp className={cn("size-3.5", bumped && "fill-primary")} />
        Helpful ({helpfulCount})
      </button>
    </li>
  );
}

/**
 * The seller's reply plus the back-and-forth thread beneath a review. The
 * seller's first reply comes from `review.response`; every follow-up is a
 * `review.replies` message. The review's author gets a reply box at the bottom.
 */
function ReviewConversation({
  review,
  productId,
  canReply,
  reviewerName,
}: {
  review: Review;
  productId: string;
  canReply: boolean;
  reviewerName: string | null;
}) {
  return (
    <div className="mt-3 space-y-2">
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
          authorName={m.authorRole === "customer" ? reviewerName : null}
        />
      ))}
      {canReply && <ReviewReplyForm reviewId={review.id} productId={productId} />}
    </div>
  );
}

function ConversationBubble({
  role,
  body,
  createdAt,
  authorName,
}: {
  role: ReviewReplyMessage["authorRole"];
  body: string;
  createdAt: string;
  authorName?: string | null;
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
        {isVendor ? "Seller" : authorName || "Buyer"}
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

/** Inline reply box shown to the review author under the seller's response. */
function ReviewReplyForm({
  reviewId,
  productId,
}: {
  reviewId: string;
  productId: string;
}) {
  const reply = useReplyToReview(productId);
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
      { reviewId, body: trimmed },
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

function ReviewListSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Questions                                                              */
/* ----------------------------------------------------------------------- */

function QuestionsTab({ productId }: { productId: string }) {
  const { data, isLoading, isError } = useProductQuestions(productId);
  const questions = data ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:gap-6">
      <div className="min-w-0">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<HelpCircle className="size-6" />}
            title="Couldn't load questions"
            description="Please try again in a moment."
          />
        ) : questions.length === 0 ? (
          <EmptyState
            icon={<MessagesSquare />}
            title="No questions yet"
            description="Ask the seller anything about this product — they usually reply within a day."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {questions.map((q) => (
              <QuestionItem key={q.id} question={q} />
            ))}
          </ul>
        )}
      </div>

      <AskQuestionForm productId={productId} />
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  vendor: "Seller",
  admin: "GCL",
  customer: "Buyer",
};

function QuestionItem({ question }: { question: Question }) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-navy text-[11px] font-extrabold text-white">
          Q
        </span>
        <p className="text-[14px] font-bold leading-snug text-ink">
          {question.body}
        </p>
      </div>

      {question.answers.length > 0 ? (
        <div className="mt-3 space-y-3 border-l-2 border-border pl-4">
          {question.answers.map((a) => (
            <div key={a.id} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-soft text-[11px] font-extrabold text-primary">
                A
              </span>
              <div className="min-w-0">
                {a.responderRole && (
                  <span className="block text-[11px] font-extrabold uppercase tracking-wide text-faint">
                    {ROLE_LABEL[a.responderRole] ?? a.responderRole}
                  </span>
                )}
                <p className="text-[13.5px] leading-relaxed text-sub">
                  {a.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 pl-8 text-[12.5px] font-semibold text-faint">
          Awaiting an answer from the seller.
        </p>
      )}
    </li>
  );
}

function AskQuestionForm({ productId }: { productId: string }) {
  const { requireAuth } = useAuth();
  const ask = useAskQuestion(productId);
  const [body, setBody] = React.useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length < 5) {
      toast.error("Please enter a more detailed question.");
      return;
    }
    requireAuth(() => {
      ask.mutate(trimmed, {
        onSuccess: () => {
          setBody("");
          toast.success("Question submitted", {
            description: "We'll notify you when the seller replies.",
          });
        },
        onError: (err) =>
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Couldn't submit your question.",
          ),
      });
    });
  };

  return (
    <Card className="h-fit lg:sticky lg:top-24">
      <CardContent className="py-5">
        <h3 className="font-display text-base font-extrabold">
          Ask a question
        </h3>
        <p className="mt-0.5 text-[12.5px] text-faint">
          Get answers from the seller and other buyers.
        </p>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <Field id="ask-question" label="Your question">
            <textarea
              id="ask-question"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="e.g. Is this compatible with…?"
              className="flex w-full resize-none rounded-[var(--radius)] border border-input bg-muted px-3.5 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </Field>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={ask.isPending}
          >
            {ask.isPending ? "Submitting…" : "Submit question"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
