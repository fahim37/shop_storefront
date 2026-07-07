/**
 * Store-page header: vendor-configurable banner (custom image / profile
 * photo / accent gradient, overlay, height, layout), logo, name, tagline,
 * trust stats and the follow/message actions. Server Component — the two
 * action buttons are client islands.
 */
import * as React from "react";
import { CalendarDays, Package, Store as StoreIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import type { StoreHeader as StoreHeaderConfig, StorePagePayload, StoreTheme } from "@/lib/api/types";
import { RatingStars } from "@/components/ui/rating-stars";
import { FollowStoreButton } from "@/components/store/follow-store-button";
import { MessageStoreButton } from "@/components/store/message-store-button";

/** Fallback for documents published before header customization existed. */
export function defaultHeaderFor(theme: StoreTheme): StoreHeaderConfig {
  return {
    background: theme.headerBanner ? "banner" : "gradient",
    imageMediaId: null,
    overlay: 30,
    height: "normal",
    align: "left",
    showTagline: true,
    showStats: true,
  };
}

const HEIGHT_CLS: Record<StoreHeaderConfig["height"], string> = {
  compact: "h-32 sm:h-40",
  normal: "h-44 sm:h-60",
  tall: "h-60 sm:h-80",
};

export function StoreHeader({
  vendor,
  theme,
  header,
}: {
  vendor: StorePagePayload["vendor"];
  theme: StoreTheme;
  header?: StoreHeaderConfig;
}) {
  const cfg = header ?? defaultHeaderFor(theme);
  const rating = vendor.ratingAverage ? Number(vendor.ratingAverage) : null;
  const joined = new Date(vendor.joinedAt).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

  const imageSrc =
    cfg.background === "custom"
      ? mediaUrl(cfg.imageMediaId, "hero")
      : cfg.background === "banner"
        ? vendor.storeBannerUrl
        : null;
  const centered = cfg.align === "center";

  return (
    <header className="relative">
      {/* Backdrop: configured image, or an accent gradient. */}
      <div className={cn("relative w-full overflow-hidden", HEIGHT_CLS[cfg.height])}>
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
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
        {/* configurable scrim + constant bottom gradient for text legibility */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${cfg.overlay / 100})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div
          className={cn(
            "wrap relative z-10 flex h-full flex-col text-white",
            centered ? "items-center justify-center pb-0 text-center" : "justify-end pb-4",
          )}
        >
          <div
            className={cn(
              "flex gap-3",
              centered
                ? "flex-col items-center"
                : "w-full flex-wrap items-end justify-between",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center gap-3 sm:gap-4",
                centered && "flex-col",
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/60",
                  cfg.height === "compact" ? "size-12 sm:size-14" : "size-16 sm:size-20",
                )}
              >
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
                {cfg.showTagline && vendor.tagline ? (
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-1 text-13 text-white/85 sm:text-sm",
                      centered && "line-clamp-2 max-w-xl",
                    )}
                  >
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
      {cfg.showStats ? (
        <div
          className="border-b"
          style={{
            borderColor: "color-mix(in srgb, var(--sp-fg) 10%, transparent)",
            background: "color-mix(in srgb, var(--sp-fg) 3%, var(--sp-bg))",
          }}
        >
          <div
            className={cn(
              "wrap flex flex-wrap items-center gap-x-6 gap-y-1.5 py-2.5 text-13",
              centered && "justify-center",
            )}
          >
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
      ) : null}
    </header>
  );
}
