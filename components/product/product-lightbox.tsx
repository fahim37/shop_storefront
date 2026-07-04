"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import { MediaImage } from "@/components/ui/media-image";
import type { ProductImage } from "@/lib/api/types";

const ZOOM = 2.5;

/** Horizontal drag (px) past which a release navigates to the next image. */
const SWIPE_NAV_PX = 56;
/** Downward drag (px) past which a release closes the viewer. */
const SWIPE_CLOSE_PX = 90;

/**
 * Fullscreen image viewer — the touch-first zoom path (the inline hero only
 * magnifies on a fine pointer + hover, i.e. desktop mice). Here, on any device:
 *   • tap / click the image to toggle zoom (1× ↔ {@link ZOOM}×)
 *   • at 1×, swipe left/right to change image, swipe down to close
 *   • drag (touch or mouse) to pan while zoomed
 *   • arrows / thumbnails / ←→ keys to change image, Esc / ✕ to close
 * Native pinch-to-zoom also still works since the page sets no viewport lock.
 */
export function ProductLightbox({
  images,
  index,
  onIndex,
  onClose,
  title,
}: {
  images: ProductImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  title: string;
}) {
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  // Unzoomed finger-follow displacement while swiping between images.
  const [swipe, setSwipe] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const stripRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{
    x: number;
    y: number;
    bx: number;
    by: number;
    dx: number;
    dy: number;
    moved: boolean;
  } | null>(null);

  // Lock body scroll while the viewer is open.
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keep the active thumbnail centered in its strip.
  React.useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    if (!strip || !el) return;
    strip.scrollTo({
      left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [index]);

  const count = images.length;
  // Every image change flows through here (arrows, keyboard, swipe, thumbs),
  // so resetting zoom/swipe in the same handler keeps it out of an effect.
  const go = React.useCallback(
    (next: number) => {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setSwipe({ x: 0, y: 0 });
      onIndex((next + count) % count);
    },
    [count, onIndex],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onClose]);

  const toggleZoom = () => {
    if (scale > 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setScale(ZOOM);
    }
  };

  const clampOffset = (x: number, y: number, s: number) => {
    const c = containerRef.current;
    const maxX = c ? (c.clientWidth * (s - 1)) / 2 : 0;
    const maxY = c ? (c.clientHeight * (s - 1)) / 2 : 0;
    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      bx: offset.x,
      by: offset.y,
      dx: 0,
      dy: 0,
      moved: false,
    };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current.dx = dx;
    drag.current.dy = dy;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.current.moved = true;
    if (scale > 1) {
      setOffset(clampOffset(drag.current.bx + dx, drag.current.by + dy, scale));
    } else {
      // Unzoomed: the image follows the finger, so a swipe reads as a slide.
      setSwipe({ x: dx, y: dy });
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    // A tap (no real movement) toggles zoom; a drag ends a pan or a swipe.
    if (!d.moved) {
      toggleZoom();
      return;
    }
    if (scale === 1) {
      const horizontal = Math.abs(d.dx) > Math.abs(d.dy);
      if (horizontal && count > 1 && Math.abs(d.dx) > SWIPE_NAV_PX) {
        go(index + (d.dx < 0 ? 1 : -1)); // go() resets the swipe state
        return;
      }
      if (!horizontal && d.dy > SWIPE_CLOSE_PX) {
        onClose();
        return;
      }
      setSwipe({ x: 0, y: 0 }); // below threshold — spring back
    }
  };

  const src = mediaUrl(images[index]?.mediaId, "original");

  // No `mounted` gate needed: the lightbox only renders after a user click
  // (post-hydration), so `document.body` is always available for the portal.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/92 animate-in fade-in-0 duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — image viewer`}
    >
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90">
        <span className="text-[13px] font-bold tabular-nums">
          {index + 1} / {count}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex size-full touch-none select-none items-center justify-center overflow-hidden"
          style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={images[index]?.id ?? index}
              src={src}
              alt={images[index]?.altText ?? title}
              draggable={false}
              className={cn(
                "max-h-full max-w-full object-contain animate-in fade-in-0 duration-200",
                !dragging && "transition-transform duration-200",
              )}
              style={{
                transform: `translate(${offset.x + swipe.x}px, ${offset.y + swipe.y}px) scale(${scale})`,
              }}
            />
          ) : null}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous image"
              className="absolute left-2.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/40 backdrop-blur transition-colors hover:bg-black/75 sm:left-4 sm:size-11"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next image"
              className="absolute right-2.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/40 backdrop-blur transition-colors hover:bg-black/75 sm:right-4 sm:size-11"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={toggleZoom}
          className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-white/90 backdrop-blur transition-colors hover:bg-white/20"
        >
          {scale > 1 ? (
            <>
              <ZoomOut className="size-4" /> Reset
            </>
          ) : (
            <>
              <ZoomIn className="size-4" /> Tap image to zoom
            </>
          )}
        </button>
      </div>

      {/* thumbnail strip */}
      {count > 1 && (
        <div
          ref={stripRef}
          className="no-scrollbar relative overflow-x-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto flex w-max gap-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                data-thumb={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`View image ${i + 1}`}
                aria-pressed={i === index}
                className={cn(
                  "relative size-12 shrink-0 overflow-hidden rounded border-2 transition-colors sm:size-14",
                  i === index
                    ? "border-white"
                    : "border-white/25 opacity-70 hover:border-white/60 hover:opacity-100",
                )}
              >
                <MediaImage
                  mediaId={img.mediaId}
                  variant="thumbnail"
                  alt=""
                  className="object-cover"
                  sizes="56px"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
