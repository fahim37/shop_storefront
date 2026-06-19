"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import { MediaImage } from "@/components/ui/media-image";
import type { ProductImage } from "@/lib/api/types";

const ZOOM = 2.5;

/**
 * Fullscreen image viewer — the touch-first zoom path (the inline hero only
 * magnifies on a fine pointer + hover, i.e. desktop mice). Here, on any device:
 *   • tap / click the image to toggle zoom (1× ↔ {@link ZOOM}×)
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
  const [mounted, setMounted] = React.useState(false);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{
    x: number;
    y: number;
    bx: number;
    by: number;
    moved: boolean;
  } | null>(null);

  React.useEffect(() => setMounted(true), []);

  // Lock body scroll while the viewer is open.
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Reset zoom whenever the active image changes.
  React.useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [index]);

  const count = images.length;
  const go = React.useCallback(
    (next: number) => onIndex((next + count) % count),
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
      moved: false,
    };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.current.moved = true;
    if (scale > 1) {
      setOffset(clampOffset(drag.current.bx + dx, drag.current.by + dy, scale));
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    // A tap (no real movement) toggles zoom; a drag just ends the pan.
    if (d && !d.moved) toggleZoom();
  };

  const src = mediaUrl(images[index]?.mediaId, "original");

  if (!mounted) return null;

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
              src={src}
              alt={images[index]?.altText ?? title}
              draggable={false}
              className={cn(
                "max-h-full max-w-full object-contain",
                !dragging && "transition-transform duration-200",
              )}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
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
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition-colors hover:bg-white/20 sm:left-4"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition-colors hover:bg-white/20 sm:right-4"
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
        <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto px-4 py-3">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === index}
              className={cn(
                "relative size-12 shrink-0 overflow-hidden rounded border-2 transition-colors",
                i === index
                  ? "border-white"
                  : "border-white/25 hover:border-white/60",
              )}
            >
              <MediaImage
                mediaId={img.mediaId}
                variant="thumbnail"
                alt=""
                className="object-cover"
                sizes="48px"
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
