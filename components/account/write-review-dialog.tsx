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
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { toast } from "@/components/ui/sonner";
import {
  useAttachReviewMedia,
  useRemoveReviewMedia,
  useSubmitReview,
  useUpdateReview,
} from "@/lib/api/reviews";
import { ApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";
import {
  ReviewPhotoUploader,
  type ReviewPhoto,
} from "@/components/account/review-photo-uploader";
import type { MyReview } from "@/lib/api/types";

export interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  subOrderId: string;
  productTitle: string;
  /**
   * The user's existing review for this item, if any. When present the dialog
   * switches to edit mode: fields are pre-filled and submit PATCHes instead of
   * creating a new review.
   */
  existingReview?: MyReview | null;
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
  existingReview,
}: WriteReviewDialogProps) {
  const submit = useSubmitReview();
  const update = useUpdateReview();
  const attachMedia = useAttachReviewMedia();
  const removeMedia = useRemoveReviewMedia();
  const isEdit = !!existingReview;
  const pending = isEdit ? update.isPending : submit.isPending;

  const [rating, setRating] = React.useState(0);
  const [hovered, setHovered] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [recommend, setRecommend] = React.useState(true);
  const [photos, setPhotos] = React.useState<ReviewPhoto[]>([]);
  const [ratingError, setRatingError] = React.useState<string | undefined>();

  // Reset the form whenever the dialog transitions to open. Done during render
  // (tracking the previous `open`) rather than in an effect so the fields are
  // populated on the very first open frame. In edit mode we seed from the
  // existing review; otherwise we start from a blank 5-star form.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setRating(existingReview?.rating ?? 5);
    setHovered(0);
    setTitle(existingReview?.title ?? "");
    setBody(existingReview?.body ?? "");
    setRecommend(existingReview?.recommend ?? true);
    setPhotos(
      (existingReview?.media ?? []).map((m) => ({
        key: m.id,
        status: "existing" as const,
        reviewMediaId: m.id,
        url: m.url,
      })),
    );
    setRatingError(undefined);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const displayRating = hovered || rating;
  const uploading = photos.some((p) => p.status === "uploading");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1) {
      setRatingError("Please pick a star rating.");
      return;
    }
    if (uploading) {
      toast.error("Please wait for your photos to finish uploading.");
      return;
    }
    // Freshly-uploaded photos not yet linked to a review.
    const newMediaIds = photos
      .filter((p) => p.status === "uploaded" && p.mediaId)
      .map((p) => p.mediaId as string);
    try {
      if (isEdit && existingReview) {
        await update.mutateAsync({
          reviewId: existingReview.id,
          productId,
          rating,
          // Send null (not undefined) to clear a previously-set field.
          title: title.trim() || null,
          body: body.trim() || null,
          recommend,
        });
        // Apply photo changes after the content save. These are non-fatal —
        // the review text is already saved — so a failure warns but still closes.
        try {
          const keptExisting = new Set(
            photos.filter((p) => p.status === "existing").map((p) => p.reviewMediaId),
          );
          const removed = (existingReview.media ?? []).filter(
            (m) => !keptExisting.has(m.id),
          );
          if (newMediaIds.length > 0) {
            await attachMedia.mutateAsync({
              reviewId: existingReview.id,
              productId,
              mediaIds: newMediaIds,
            });
          }
          for (const m of removed) {
            await removeMedia.mutateAsync({
              reviewId: existingReview.id,
              productId,
              reviewMediaId: m.id,
            });
          }
        } catch {
          toast.error("Saved, but some photos couldn't be updated. Try again from your order.");
        }
        toast.success("Review updated", {
          description: "Your changes are saved and will show as edited on the product page.",
        });
      } else {
        await submit.mutateAsync({
          productId,
          subOrderId,
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
          recommend,
          mediaIds: newMediaIds.length > 0 ? newMediaIds : undefined,
        });
        toast.success("Review submitted", {
          description: "Thanks! Your review will appear on the product page once published.",
        });
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(reviewErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Edit your review" : "Write a review"}
          </DialogTitle>
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
            <div className="flex items-center justify-between">
              <EmojiPicker
                align="start"
                side="top"
                label="Add emoji to your review"
                className="size-8"
                onSelect={(emoji) =>
                  setBody((b) => (b.length + emoji.length <= BODY_MAX ? b + emoji : b))
                }
              />
              <p className="text-xs text-faint">
                {body.length}/{BODY_MAX}
              </p>
            </div>
          </div>

          {/* Photos */}
          <ReviewPhotoUploader
            photos={photos}
            onChange={setPhotos}
            disabled={pending}
          />

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
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              loading={pending}
              disabled={uploading}
            >
              {isEdit ? "Save changes" : "Submit review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
