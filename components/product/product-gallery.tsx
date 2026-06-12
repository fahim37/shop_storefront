"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MediaImage } from "@/components/ui/media-image";
import type { ProductImage } from "@/lib/api/types";

export interface ProductGalleryProps {
  images: ProductImage[];
  title: string;
}

/**
 * PDP image gallery: a thumbnail rail (vertical on desktop, horizontal scroll
 * on mobile) beside a large hero image. Clicking a thumb swaps the hero.
 * Falls back to a single branded placeholder when there are no images.
 */
export function ProductGallery({ images, title }: ProductGalleryProps) {
  // Stable, primary-first ordering so the default hero is the primary image.
  const ordered = React.useMemo(() => {
    return [...images].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.position - b.position;
    });
  }, [images]);

  const [activeId, setActiveId] = React.useState<string | null>(
    ordered[0]?.id ?? null,
  );

  const active =
    ordered.find((img) => img.id === activeId) ?? ordered[0] ?? null;

  const hasThumbs = ordered.length > 1;

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
      {/* Thumbnail rail */}
      {hasThumbs && (
        <div className="no-scrollbar flex shrink-0 gap-2.5 overflow-x-auto sm:max-h-[560px] sm:flex-col sm:overflow-y-auto">
          {ordered.map((img) => {
            const on = active?.id === img.id;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveId(img.id)}
                aria-label={img.altText ?? title}
                aria-pressed={on}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors sm:size-[68px]",
                  on
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40",
                )}
              >
                <MediaImage
                  mediaId={img.mediaId}
                  variant="thumbnail"
                  alt={img.altText ?? title}
                  className="object-cover"
                  sizes="68px"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Hero */}
      <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-muted shadow-[var(--shadow-card)]">
        <MediaImage
          key={active?.id ?? "placeholder"}
          mediaId={active?.mediaId}
          variant="hero"
          alt={active?.altText ?? title}
          className="object-contain animate-in fade-in-0"
          sizes="(min-width: 1024px) 520px, 100vw"
        />
      </div>
    </div>
  );
}
