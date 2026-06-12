"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MediaImage } from "@/components/ui/media-image";
import { mediaUrl } from "@/lib/media";
import type { ProductImage } from "@/lib/api/types";

export interface ProductGalleryProps {
  images: ProductImage[];
  title: string;
}

/** Magnification factor of the hover-zoom panel (Daraz-style). */
const ZOOM = 2.4;

type LensState = {
  /** Lens top-left (px, relative to the hero box). */
  x: number;
  y: number;
  /** Hero box size (px). */
  w: number;
  h: number;
  /** Lens size (px) — panel size / ZOOM. */
  lw: number;
  lh: number;
};

/**
 * PDP image gallery: a thumbnail rail (vertical on desktop, horizontal scroll
 * on mobile) beside a large hero image. Clicking a thumb swaps the hero.
 *
 * Desktop (fine pointer) hover adds a Daraz-style magnifier: a translucent
 * lens follows the cursor over the hero and a zoom panel appears to the right
 * showing the lens area at {@link ZOOM}× from the original-variant image.
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

  /* ── Hover zoom ──────────────────────────────────────────────────────── */
  const heroRef = React.useRef<HTMLDivElement>(null);
  const [lens, setLens] = React.useState<LensState | null>(null);
  const zoomSrc = mediaUrl(active?.mediaId, "original");

  // Only enable on devices that actually hover with a precise pointer.
  const canZoom = React.useSyncExternalStore(
    React.useCallback((notify) => {
      const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    }, []),
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    () => false,
  );

  // Pre-warm the high-res zoom source as soon as the hero changes, so the
  // panel is sharp on first hover instead of loading lazily.
  React.useEffect(() => {
    if (!canZoom || !zoomSrc) return;
    const img = new Image();
    img.src = zoomSrc;
  }, [canZoom, zoomSrc]);

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  const moveLens = (e: React.MouseEvent) => {
    const box = heroRef.current?.getBoundingClientRect();
    if (!box) return;
    const lw = box.width / ZOOM;
    const lh = box.height / ZOOM;
    setLens({
      x: clamp(e.clientX - box.left - lw / 2, 0, box.width - lw),
      y: clamp(e.clientY - box.top - lh / 2, 0, box.height - lh),
      w: box.width,
      h: box.height,
      lw,
      lh,
    });
  };

  const zooming = canZoom && lens !== null && Boolean(zoomSrc);

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
                onMouseEnter={() => setActiveId(img.id)}
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

      {/* Hero + zoom panel (panel anchors to this non-clipping wrapper) */}
      <div className="relative min-w-0 flex-1">
        <div
          ref={heroRef}
          onMouseMove={canZoom && zoomSrc ? moveLens : undefined}
          onMouseLeave={() => setLens(null)}
          className={cn(
            "relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted shadow-[var(--shadow-card)]",
            zooming && "cursor-crosshair",
          )}
        >
          <MediaImage
            key={active?.id ?? "placeholder"}
            mediaId={active?.mediaId}
            variant="hero"
            alt={active?.altText ?? title}
            className="object-contain animate-in fade-in-0"
            sizes="(min-width: 1024px) 520px, 100vw"
          />

          {/* Lens */}
          {zooming && lens && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-md bg-primary/10 ring-1 ring-primary/40 backdrop-brightness-105 animate-in fade-in-0 duration-150"
              style={{
                width: lens.lw,
                height: lens.lh,
                transform: `translate(${lens.x}px, ${lens.y}px)`,
              }}
            />
          )}
        </div>

        {/* Zoom panel — overlays the info column to the right (lg+ only) */}
        {zooming && lens && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[calc(100%+16px)] z-30 hidden w-full overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-pop)] animate-in fade-in-0 zoom-in-95 duration-150 lg:block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomSrc!}
              alt=""
              draggable={false}
              className="max-w-none object-contain"
              style={{
                width: lens.w * ZOOM,
                height: lens.h * ZOOM,
                transform: `translate(${-lens.x * ZOOM}px, ${-lens.y * ZOOM}px)`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
