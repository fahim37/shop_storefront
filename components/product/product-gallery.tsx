"use client";

import * as React from "react";
import { ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaImage } from "@/components/ui/media-image";
import { ProductLightbox } from "@/components/product/product-lightbox";
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
  /** Zoom-panel width (px) — spans the full info column to the right. */
  panelW: number;
};

/**
 * Width of the zoom panel so it fills the PDP's right (info) column: from the
 * gallery's right edge + grid gutter to the page content's right edge. Falls
 * back to the hero width if the layout can't be measured (SSR/odd wrappers).
 */
const PDP_GRID_GAP = 40; // matches the top grid's `lg:gap-10`
function zoomPanelWidth(heroEl: HTMLElement, heroBox: DOMRect): number {
  const wrap = heroEl.closest<HTMLElement>(".wrap");
  if (!wrap) return heroBox.width;
  const padRight = parseFloat(getComputedStyle(wrap).paddingRight) || 0;
  const contentRight = wrap.getBoundingClientRect().right - padRight;
  const width = contentRight - heroBox.right - PDP_GRID_GAP;
  // Guard against a collapsed/negative measurement — keep the hero-width panel.
  return width > heroBox.width * 0.4 ? width : heroBox.width;
}

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

  const activeIndex = Math.max(
    0,
    ordered.findIndex((img) => img.id === active?.id),
  );
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

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

  // Pre-warm the high-res zoom source on hover INTENT (first mouse-enter of
  // the hero), not eagerly on every hero change — otherwise skimming the
  // thumbnail rail downloads a full-resolution original per thumbnail even if
  // the zoom is never used. De-duped per URL for the session.
  const warmedRef = React.useRef<Set<string>>(new Set());
  const warmZoom = React.useCallback(() => {
    if (!canZoom || !zoomSrc || warmedRef.current.has(zoomSrc)) return;
    warmedRef.current.add(zoomSrc);
    const img = new Image();
    img.src = zoomSrc;
  }, [canZoom, zoomSrc]);

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  const moveLens = (e: React.MouseEvent) => {
    const hero = heroRef.current;
    const box = hero?.getBoundingClientRect();
    if (!hero || !box) return;
    // The panel fills the info column; the lens is its footprint back on the
    // hero (panel size ÷ ZOOM), so the magnified view matches the lens exactly.
    const panelW = zoomPanelWidth(hero, box);
    const lw = panelW / ZOOM;
    const lh = box.height / ZOOM;
    setLens({
      x: clamp(e.clientX - box.left - lw / 2, 0, box.width - lw),
      y: clamp(e.clientY - box.top - lh / 2, 0, box.height - lh),
      w: box.width,
      h: box.height,
      lw,
      lh,
      panelW,
    });
  };

  const zooming = canZoom && lens !== null && Boolean(zoomSrc);

  return (
    <>
      {/* ── Mobile (<sm): swipe-through carousel ────────────────────────── */}
      <MobileGallery
        images={ordered}
        title={title}
        activeIndex={activeIndex}
        onActiveIndexChange={(i) => setActiveId(ordered[i]?.id ?? null)}
        onOpen={() => setLightboxOpen(true)}
      />

      {/* ── Desktop (sm+): thumbnail rail + hero image with hover zoom ───── */}
      <div className="hidden flex-col-reverse gap-3 sm:flex sm:flex-row sm:gap-4">
      {/* Thumbnail rail */}
      {hasThumbs && (
        <div className="no-scrollbar flex shrink-0 gap-2.5 overflow-x-auto sm:max-h-[640px] sm:flex-col sm:overflow-y-auto">
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
                  "relative size-16 shrink-0 overflow-hidden rounded border-2 bg-muted transition-colors sm:size-[76px]",
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
          role={active ? "button" : undefined}
          tabIndex={active ? 0 : undefined}
          aria-label={active ? "Open image viewer" : undefined}
          onClick={active ? () => setLightboxOpen(true) : undefined}
          onKeyDown={
            active
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLightboxOpen(true);
                  }
                }
              : undefined
          }
          onMouseEnter={warmZoom}
          onMouseMove={canZoom && zoomSrc ? moveLens : undefined}
          onMouseLeave={() => setLens(null)}
          className={cn(
            "group/hero relative aspect-square overflow-hidden rounded-xl border border-border bg-muted",
            active &&
              "cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-primary",
            zooming && "cursor-crosshair",
          )}
        >
          <MediaImage
            key={active?.id ?? "placeholder"}
            mediaId={active?.mediaId}
            variant="hero"
            alt={active?.altText ?? title}
            className="object-contain animate-in fade-in-0"
            sizes="(min-width: 1024px) 620px, 100vw"
          />

          {/* Tap/expand hint — fades out on desktop hover, where the
              inline magnifier takes over; the primary zoom path on touch. */}
          {active && (
            <span className="pointer-events-none absolute bottom-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-opacity duration-200 group-hover/hero:opacity-0">
              <ZoomIn className="size-4" strokeWidth={2.2} />
            </span>
          )}

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

        {/* Zoom panel — fills the info column to the right (lg+ only) */}
        {zooming && lens && (
          <div
            aria-hidden
            style={{ width: lens.panelW }}
            className="pointer-events-none absolute inset-y-0 left-[calc(100%+40px)] z-30 hidden overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-pop)] animate-in fade-in-0 zoom-in-95 duration-150 lg:block"
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

      {lightboxOpen && active && (
        <ProductLightbox
          images={ordered}
          index={activeIndex}
          onIndex={(i) => setActiveId(ordered[i]?.id ?? null)}
          onClose={() => setLightboxOpen(false)}
          title={title}
        />
      )}
    </>
  );
}

/**
 * Mobile-only image gallery: a full-width horizontal scroll-snap carousel the
 * user swipes through (one slide per fling, Daraz-style), with a position
 * counter and a tappable thumbnail rail like the desktop gallery. Tapping a
 * slide opens the fullscreen lightbox. Scroll position drives {@link activeIndex}
 * so the counter/thumbs and lightbox start on the visible image.
 */
function MobileGallery({
  images,
  title,
  activeIndex,
  onActiveIndexChange,
  onOpen,
}: {
  images: ProductImage[];
  title: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onOpen: () => void;
}) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const stripRef = React.useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== activeIndex) onActiveIndexChange(index);
  };

  /** Thumb tap → glide the carousel to that slide (onScroll syncs the index). */
  const goTo = (i: number) => {
    const el = scrollerRef.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  // Keep the active thumbnail centered in its rail while swiping.
  React.useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-thumb="${activeIndex}"]`);
    if (!strip || !el) return;
    strip.scrollTo({
      left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [activeIndex]);

  return (
    <div className="sm:hidden">
      {/* Full-bleed hero: negative margins cancel the page's `.wrap` inline
          padding (1rem) and its top padding (py-3) so the image runs edge to
          edge and flush to the top, under the floating PdpTopBar chips. */}
      <div className="relative -mx-4 -mt-3">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-muted"
        >
          {images.length > 0 ? (
            images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={onOpen}
                aria-label="Open image viewer"
                className="relative aspect-square w-full shrink-0 snap-center snap-always"
              >
                <MediaImage
                  mediaId={img.mediaId}
                  variant="hero"
                  alt={img.altText ?? title}
                  className="object-contain"
                  sizes="100vw"
                  // Pre-warm the visible slide and its neighbours so swiping
                  // never lands on a gray placeholder mid-gesture.
                  loading={Math.abs(i - activeIndex) <= 1 ? "eager" : "lazy"}
                />
              </button>
            ))
          ) : (
            <div className="relative aspect-square w-full shrink-0">
              <MediaImage variant="hero" alt={title} className="object-contain" />
            </div>
          )}
        </div>

        {/* Position counter */}
        {images.length > 1 && (
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-full bg-black/45 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
            {activeIndex + 1}/{images.length}
          </span>
        )}
      </div>

      {/* Thumbnail rail — same affordance as the desktop gallery */}
      {images.length > 1 && (
        <div ref={stripRef} className="no-scrollbar relative mt-2.5 overflow-x-auto">
          <div className="mx-auto flex w-max gap-2">
            {images.map((img, i) => {
              const on = i === activeIndex;
              return (
                <button
                  key={img.id}
                  data-thumb={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={on}
                  className={cn(
                    "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                    on
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border",
                  )}
                >
                  <MediaImage
                    mediaId={img.mediaId}
                    variant="thumbnail"
                    alt={img.altText ?? title}
                    className="object-cover"
                    sizes="56px"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
