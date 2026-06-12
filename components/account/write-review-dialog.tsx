"use client";

import * as React from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useSubmitReview } from "@/lib/api/reviews";
import { ApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";

export interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  subOrderId: string;
  productTitle: string;
}

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

const BODY_MAX = 2000;
const TITLE_MAX = 120;

/** Friendly copy for the review-specific error codes the backend can return. */
function reviewErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "REVIEW_NOT_VERIFIED_PURCHASE":
        return "We couldn't verify this purchase, so a review can't be added for this order.";
      case "RESOURCE_DUPLICATE":
        return "You've already reviewed this item. Thanks for sharing your thoughts!";
      case "REVIEW_BANNED_KEYWORD":
        return "Your review contains words that aren't allowed. Please rephrase and try again.";
      default:
        return err.message || "We couldn't submit your review. Please try again.";
    }
  }
  return "We couldn't submit your review. Please try again.";
}

/**
 * Reusable dialog for writing a verified-purchase review. Rendered from a
 * delivered-order context (needs a real `subOrderId`). Controlled via
 * `open`/`onOpenChange` so callers own the trigger.
 */
export function WriteReviewDialog({
  open,
  onOpenChange,
  productId,
  subOrderId,
  productTitle,
}: WriteReviewDialogProps) {
  const submit = useSubmitReview();

  const [rating, setRating] = React.useState(0);
  const [hovered, setHovered] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [recommend, setRecommend] = React.useState(true);
  const [ratingError, setRatingError] = React.useState<string | undefined>();

  // Reset the form whenever the dialog is (re)opened.
  React.useEffect(() => {
    if (open) {
      setRating(0);
      setHovered(0);
      setTitle("");
      setBody("");
      setRecommend(true);
      setRatingError(undefined);
    }
  }, [open]);

  const displayRating = hovered || rating;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1) {
      setRatingError("Please pick a star rating.");
      return;
    }
    try {
      await submit.mutateAsync({
        productId,
        subOrderId,
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
        recommend,
      });
      toast.success("Review submitted", {
        description: "Thanks! Your review will appear on the product page once published.",
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(reviewErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Write a review</DialogTitle>
          <DialogDescription className="line-clamp-2">{productTitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          {/* Star rating */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-rating">Your rating</Label>
            <div className="flex items-center gap-3">
              <div
                id="review-rating"
                className="flex items-center gap-1"
                role="radiogroup"
                aria-label="Star rating"
                onMouseLeave={() => setHovered(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= displayRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      className="rounded-md p-0.5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
                      onMouseEnter={() => setHovered(star)}
                      onFocus={() => setHovered(star)}
                      onBlur={() => setHovered(0)}
                      onClick={() => {
                        setRating(star);
                        setRatingError(undefined);
                      }}
                    >
                      <Star
                        size={30}
                        strokeWidth={1.6}
                        className={cn(
                          "transition-colors",
                          active
                            ? "fill-amber-deep text-amber-deep"
                            : "text-[oklch(0.85_0.02_258)]",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              {displayRating > 0 && (
                <span className="text-sm font-semibold text-amber-deep">
                  {RATING_LABELS[displayRating]}
                </span>
              )}
            </div>
            {ratingError && (
              <p role="alert" className="text-sm text-destructive">
                {ratingError}
              </p>
            )}
          </div>

          {/* Title */}
          <Field
            id="review-title"
            label="Title"
            description="Sum up your experience in a few words (optional)."
          >
            <Input
              id="review-title"
              value={title}
              maxLength={TITLE_MAX}
              placeholder="e.g. Great value for money"
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-body">Your review</Label>
            <textarea
              id="review-body"
              value={body}
              maxLength={BODY_MAX}
              rows={5}
              placeholder="What did you like or dislike? How was the quality and delivery?"
              onChange={(e) => setBody(e.target.value)}
              className={cn(
                "flex w-full resize-y rounded-[var(--radius)] border border-input bg-muted px-3.5 py-2.5 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
            <p className="self-end text-xs text-faint">
              {body.length}/{BODY_MAX}
            </p>
          </div>

          {/* Recommend */}
          <label
            htmlFor="review-recommend"
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 transition-colors hover:bg-muted"
          >
            <Checkbox
              id="review-recommend"
              checked={recommend}
              onCheckedChange={(v) => setRecommend(v === true)}
            />
            <span className="text-sm font-medium text-ink">
              I&apos;d recommend this product to others
            </span>
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="soft"
              onClick={() => onOpenChange(false)}
              disabled={submit.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="accent" loading={submit.isPending}>
              Submit review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
