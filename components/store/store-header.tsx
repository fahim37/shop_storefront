/**
 * Store-page header: banner (optional per theme), logo, name, tagline,
 * trust stats and the follow/message actions. Server Component — the two
 * action buttons are client islands.
 */
import * as React from "react";
import { CalendarDays, Package, Store as StoreIcon } from "lucide-react";

import type { StorePagePayload, StoreTheme } from "@/lib/api/types";
import { RatingStars } from "@/components/ui/rating-stars";
import { FollowStoreButton } from "@/components/store/follow-store-button";
import { MessageStoreButton } from "@/components/store/message-store-button";

export function StoreHeader({
  vendor,
  theme,
}: {
  vendor: StorePagePayload["vendor"];
  theme: StoreTheme;
}) {
  const rating = vendor.ratingAverage ? Number(vendor.ratingAverage) : null;
  const joined = new Date(vendor.joinedAt).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
  const showBanner = theme.headerBanner && Boolean(vendor.storeBannerUrl);

  return (
    <header className="relative">
      {/* Backdrop: profile banner photo, or an accent gradient. */}
      <div className="relative h-44 w-full overflow-hidden sm:h-60">
        {showBanner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vendor.storeBannerUrl!}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(120deg, var(--sp-accent), color-mix(in srgb, var(--sp-accent) 60%, #000))`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

        <div className="wrap relative z-10 flex h-full flex-col justify-end pb-4 text-white">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/60 sm:size-20">
                {vendor.storeLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={vendor.storeLogoUrl}
                    alt={`${vendor.storeName} logo`}
                    className="size-full object-cover"
                  />
                ) : (
                  <StoreIcon className="size-8 text-navy" strokeWidth={1.6} />
                )}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-28">
                  {vendor.storeName}
                </h1>
                {vendor.tagline ? (
                  <p className="mt-0.5 line-clamp-1 text-13 text-white/85 sm:text-sm">
                    {vendor.tagline}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <FollowStoreButton
                vendorId={vendor.id}
                initialFollowers={vendor.followerCount}
              />
              <MessageStoreButton
                vendorId={vendor.id}
                vendorName={vendor.storeName}
                variant="ghost"
                className="h-9 rounded-full bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25 hover:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <div
        className="border-b"
        style={{
          borderColor: "color-mix(in srgb, var(--sp-fg) 10%, transparent)",
          background: "color-mix(in srgb, var(--sp-fg) 3%, var(--sp-bg))",
        }}
      >
        <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-1.5 py-2.5 text-13">
          {rating !== null ? (
            <span className="flex items-center gap-1.5">
              <RatingStars value={rating} className="shrink-0" />
              <b className="font-bold">{rating.toFixed(1)}</b>
              <span className="opacity-60">store rating</span>
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <Package className="size-4 opacity-60" strokeWidth={1.8} />
            <b className="font-bold">{vendor.productCount}</b>
            <span className="opacity-60">products</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 opacity-60" strokeWidth={1.8} />
            <span className="opacity-60">Joined {joined}</span>
          </span>
          {vendor.vacationMode ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-11 font-bold text-amber-800">
              On vacation — orders may ship later
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
