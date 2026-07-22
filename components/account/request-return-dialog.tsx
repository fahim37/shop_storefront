"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Sparkles, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MediaImage } from "@/components/ui/media-image";
import { toast } from "@/components/ui/sonner";
import { useInitiateReturn } from "@/lib/api/returns";
import { RETURN_REASONS } from "@/lib/orders/return-meta";
import { ApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";
import {
  ReviewPhotoUploader,
  type ReviewPhoto,
} from "@/components/account/review-photo-uploader";
import type {
  HydratedSubOrder,
  OrderItem,
  RefundPreference,
  ReturnEligibility,
  ReturnReasonCode,
} from "@/lib/api/types";

const DESCRIPTION_MAX = 2000;
const PHOTOS_MAX = 6;

export interface RequestReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  sub: HydratedSubOrder;
  /** The item whose "Return" button opened the dialog — pre-selected. */
  primaryItem: OrderItem;
  /** Per-item eligibility for this sub-order; only eligible items are offered. */
  eligibility: Map<string, ReturnEligibility>;
}

/** Friendly copy for the return-initiate error codes the backend can send. */
function returnErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message.includes("return_already_in_progress")) {
      return "A return is already in progress for one of these items.";
    }
    if (err.message.includes("return_window_expired")) {
      return "The return window for one of these items has closed.";
    }
    return err.message || "We couldn't submit your return request. Please try again.";
  }
  return "We couldn't submit your return request. Please try again.";
}

/**
 * Request-a-return dialog for a delivered sub-order. The customer picks which
 * items (and how many of each) go back, why, optional photos of the issue, and
 * how they'd like the refund. On success we navigate to the new return's
 * detail page, which shows the live status + pickup info.
 */
export function RequestReturnDialog({
  open,
  onOpenChange,
  orderId,
  sub,
  primaryItem,
  eligibility,
}: RequestReturnDialogProps) {
  const router = useRouter();
  const initiate = useInitiateReturn();

  const eligibleItems = sub.items.filter(
    (it) => eligibility.get(it.id)?.eligible,
  );
  const daysLeft = Math.max(
    0,
    ...eligibleItems.map(
      (it) => eligibility.get(it.id)?.windowDaysRemaining ?? 0,
    ),
  );

  // Selected order items → return quantity. Presence in the record = selected.
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});
  const [reasonCode, setReasonCode] = React.useState<ReturnReasonCode | null>(null);
  const [description, setDescription] = React.useState("");
  const [refund, setRefund] = React.useState<RefundPreference>("original_method");
  const [photos, setPhotos] = React.useState<ReviewPhoto[]>([]);

  // Reset the form on the closed→open transition, seeding the clicked item.
  // Done during render (tracking the previous `open`) so the first open frame
  // is already populated — callers mount the dialog conditionally, so `wasOpen`
  // starts false to also catch a mounted-already-open dialog.
  const [wasOpen, setWasOpen] = React.useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setQuantities(
      eligibility.get(primaryItem.id)?.eligible ? { [primaryItem.id]: 1 } : {},
    );
    setReasonCode(null);
    setDescription("");
    setRefund("original_method");
    setPhotos([]);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const selected = Object.entries(quantities);
  const uploading = photos.some((p) => p.status === "uploading");
  const autoReason = !!RETURN_REASONS.find((r) => r.code === reasonCode)?.auto;

  function toggleItem(item: OrderItem) {
    setQuantities((prev) => {
      if (prev[item.id]) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return { ...prev, [item.id]: 1 };
    });
  }

  function stepQuantity(item: OrderItem, delta: number) {
    setQuantities((prev) => {
      const current = prev[item.id];
      if (!current) return prev;
      const next = Math.min(item.quantity, Math.max(1, current + delta));
      return { ...prev, [item.id]: next };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reasonCode || selected.length === 0) return;
    if (uploading) {
      toast.error("Please wait for your photos to finish uploading.");
      return;
    }
    const items = selected.map(([orderItemId, quantity]) => ({
      orderItemId,
      quantity,
    }));
    // Anchor the route at the clicked item when it's still selected.
    const primaryItemId = quantities[primaryItem.id]
      ? primaryItem.id
      : items[0].orderItemId;
    const mediaIds = photos
      .filter((p) => p.status === "uploaded" && p.mediaId)
      .map((p) => p.mediaId as string);
    const note = description.trim();
    try {
      const created = await initiate.mutateAsync({
        orderId,
        primaryItemId,
        subOrderId: sub.id,
        reasonCode,
        description: note.length >= 2 ? note : undefined,
        photos: mediaIds.length > 0 ? mediaIds : undefined,
        refundPreference: refund,
        items,
      });
      toast.success(
        created.status === "approved"
          ? "Return approved"
          : "Return request submitted",
        {
          description:
            created.status === "approved"
              ? "We'll schedule a pickup for your item shortly."
              : "We'll review your request and keep you posted.",
        },
      );
      onOpenChange(false);
      router.push(`/account/returns/${created.id}`);
    } catch (err) {
      toast.error(returnErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display">Request a return</DialogTitle>
          <DialogDescription>
            {sub.vendorName ?? "This store"} ·{" "}
            {daysLeft === 1
              ? "Last day to return these items."
              : `${daysLeft} days left in the return window.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5">
          {/* Items */}
          <div className="flex flex-col gap-1.5">
            <Label>Items to return</Label>
            <ul className="flex flex-col gap-2">
              {eligibleItems.map((item) => {
                const qty = quantities[item.id];
                const checked = !!qty;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 transition-colors",
                      checked
                        ? "border-primary/40 bg-blue-soft/40"
                        : "border-border bg-card",
                    )}
                  >
                    <label className="flex cursor-pointer items-center gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleItem(item)}
                        aria-label={`Return ${item.titleSnapshot}`}
                      />
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                        <MediaImage
                          src={item.imageUrlSnapshot}
                          mediaId={item.thumbnailMediaId}
                          variant="thumbnail"
                          alt={item.titleSnapshot}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-13 font-semibold text-ink">
                          {item.titleSnapshot}
                        </p>
                        <p className="mt-0.5 text-xs text-faint">
                          Bought {item.quantity}
                        </p>
                      </div>
                    </label>

                    {/* Quantity stepper — only for selected multi-quantity lines */}
                    {checked && item.quantity > 1 && (
                      <div className="mt-2 flex items-center justify-end gap-2 pl-8">
                        <span className="text-xs font-semibold text-sub">
                          Return quantity
                        </span>
                        <div className="flex items-center gap-1 rounded-full border border-border bg-card px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => stepQuantity(item, -1)}
                            disabled={qty <= 1}
                            aria-label="Decrease return quantity"
                            className="flex size-6 items-center justify-center rounded-full text-sub transition-colors hover:bg-muted disabled:opacity-40"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-ink">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => stepQuantity(item, 1)}
                            disabled={qty >= item.quantity}
                            aria-label="Increase return quantity"
                            className="flex size-6 items-center justify-center rounded-full text-sub transition-colors hover:bg-muted disabled:opacity-40"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <Label>Why are you returning?</Label>
            <div className="flex flex-wrap gap-1.5">
              {RETURN_REASONS.map((r) => {
                const active = reasonCode === r.code;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setReasonCode(active ? null : r.code)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-sub hover:border-primary hover:text-ink",
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            {autoReason && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-green">
                <Sparkles className="size-3.5" />
                This reason is usually approved instantly with a free pickup.
              </p>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-description">Tell us more</Label>
            <textarea
              id="return-description"
              value={description}
              maxLength={DESCRIPTION_MAX}
              rows={3}
              placeholder="What went wrong? Details help us resolve your return faster (optional)…"
              onChange={(e) => setDescription(e.target.value)}
              className={cn(
                "flex w-full resize-y rounded-[var(--radius)] border border-input bg-muted px-3.5 py-2.5 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background",
              )}
            />
          </div>

          {/* Photos */}
          <ReviewPhotoUploader
            photos={photos}
            onChange={setPhotos}
            max={PHOTOS_MAX}
            disabled={initiate.isPending}
            ownerType="return_evidence"
            hint="Photos of the issue help us approve your return faster (optional)."
          />

          {/* Refund method */}
          <div className="flex flex-col gap-1.5">
            <Label>How should we refund you?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    value: "original_method" as const,
                    label: "Original payment method",
                    hint: "Back to the card / account you paid with.",
                    icon: <Sparkles className="size-4" />,
                  },
                  {
                    value: "wallet" as const,
                    label: "Store wallet credit",
                    hint: "Fastest — spend it on your next order.",
                    icon: <Wallet className="size-4" />,
                  },
                ]
              ).map((opt) => {
                const active = refund === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRefund(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-colors",
                      active
                        ? "border-primary bg-blue-soft/50"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0",
                        active ? "text-primary" : "text-faint",
                      )}
                    >
                      {opt.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-13 font-bold text-ink">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-sub">
                        {opt.hint}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="soft"
              onClick={() => onOpenChange(false)}
              disabled={initiate.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="accent"
              loading={initiate.isPending}
              disabled={!reasonCode || selected.length === 0 || uploading}
            >
              Submit return request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
