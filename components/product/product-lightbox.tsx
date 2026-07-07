"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import { MediaImage } from "@/components/ui/media-image";
import type { ProductImage } from "@/lib/api/types";

/** Scale a tap (or the hint button) zooms to. */
const TAP_ZOOM = 2.5;
/** Ceiling a pinch can settle at — pinching past it rubber-bands and springs back. */
const MAX_ZOOM = 4;

/** Horizontal drag (px) past which a release navigates to the next image. */
const SWIPE_NAV_PX = 56;
/** Downward drag (px) past which a release closes the viewer. */
const SWIPE_CLOSE_PX = 90;
/** Velocities (px/ms) past which a short flick still navigates / closes. */
const FLICK_NAV_V = 0.55;
const FLICK_CLOSE_V = 0.6;

/** Decelerating ease shared by every programmatic transform animation. */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Fullscreen image viewer — the touch-first zoom path (the inline hero only
 * magnifies on a fine pointer + hover, i.e. desktop mice). On any device:
 *   • pinch to zoom, anchored to the fingers' midpoint; the midpoint also pans,
 *     and scale/pan rubber-band past their limits then spring back on release
 *   • tap the image to zoom into the tapped spot (1× ↔ {@link TAP_ZOOM}×)
 *   • drag (touch or mouse) to pan while zoomed, with momentum on release
 *   • scroll wheel / trackpad pinch zooms about the cursor
 *   • at 1×, swipe or flick left/right to change image, swipe down to close
 *   • arrows / thumbnails / ←→ keys to change image, Esc / ✕ to close
 *
 * Gestures write the transform straight to the <img> (no React render on the
 * move path) so pinch and pan track the fingers at native frame rate.
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
  const [zoomed, setZoomed] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const stripRef = React.useRef<HTMLDivElement>(null);

  // Live transform state. Kept in refs and flushed straight to the <img>
  // style; `zoomed`/`dragging` above only drive the surrounding chrome.
  const view = React.useRef({ scale: 1, x: 0, y: 0 });
  // Unzoomed finger-follow displacement while swiping between images.
  const swipe = React.useRef({ x: 0, y: 0 });
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{
    dist: number;
    mid: { x: number; y: number };
    /** Un-rubbered scale, so resistance past the limits stays progressive. */
    raw: number;
  } | null>(null);
  const drag = React.useRef<{
    x: number;
    y: number;
    bx: number;
    by: number;
    dx: number;
    dy: number;
    moved: boolean;
  } | null>(null);
  /** Whether the current touch sequence ever had two fingers down. */
  const pinched = React.useRef(false);
  const lastTapAt = React.useRef(0);
  /** Recent pointer positions, for release velocity (momentum + flicks). */
  const samples = React.useRef<{ t: number; x: number; y: number }[]>([]);

  const apply = React.useCallback((transition = "none") => {
    const img = imgRef.current;
    if (!img) return;
    img.style.transition = transition;
    img.style.transform = `translate3d(${view.current.x + swipe.current.x}px, ${view.current.y + swipe.current.y}px, 0) scale(${view.current.scale})`;
    setZoomed(view.current.scale > 1.01);
  }, []);

  // Lock body scroll while the viewer is open.
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // The <img> remounts per image (keyed), so re-assert the (reset) transform.
  React.useLayoutEffect(() => {
    apply();
  }, [index, apply]);

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
      view.current = { scale: 1, x: 0, y: 0 };
      swipe.current = { x: 0, y: 0 };
      apply();
      onIndex((next + count) % count);
    },
    [count, onIndex, apply],
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

  /** Pointer position relative to the stage center (the transform origin's frame). */
  const rel = (cx: number, cy: number) => {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: cx - r.left - r.width / 2, y: cy - r.top - r.height / 2 };
  };

  /** Max |offset| that still keeps the scaled image covering the stage edge. */
  const bounds = (s: number) => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (img.offsetWidth * s - c.clientWidth) / 2),
      y: Math.max(0, (img.offsetHeight * s - c.clientHeight) / 2),
    };
  };

  const clamp = (v: number, lim: number) => Math.min(Math.max(v, -lim), lim);

  /** Past a pan limit, movement continues at reduced rate — elastic, not walled. */
  const rubber = (v: number, lim: number) =>
    v > lim ? lim + (v - lim) * 0.3 : v < -lim ? -lim + (v + lim) * 0.3 : v;

  /** Same idea for scale: progressive resistance outside [1, MAX_ZOOM]. */
  const rubberScale = (raw: number) =>
    raw < 1
      ? Math.pow(raw, 0.6)
      : raw > MAX_ZOOM
        ? MAX_ZOOM * Math.pow(raw / MAX_ZOOM, 0.4)
        : raw;

  /** Release velocity (px/ms) from the last ~90ms of movement. */
  const velocity = (until: number) => {
    const pts = samples.current.filter((p) => until - p.t < 90);
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (!first || !last || first === last) return { x: 0, y: 0 };
    const dt = Math.max(last.t - first.t, 1);
    return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
  };

  /**
   * A gesture may end outside legal range (rubber-banded scale, over-panned
   * edges) — spring everything back. Near-1× snaps fully home.
   */
  const settle = React.useCallback(() => {
    const s = Math.min(Math.max(view.current.scale, 1), MAX_ZOOM);
    if (s <= 1.03) {
      view.current = { scale: 1, x: 0, y: 0 };
    } else {
      const lim = bounds(s);
      view.current = {
        scale: s,
        x: clamp(view.current.x, lim.x),
        y: clamp(view.current.y, lim.y),
      };
    }
    swipe.current = { x: 0, y: 0 };
    apply(`transform 320ms ${EASE}`);
  }, [apply]);

  /** Tap/button zoom: in at the given stage point (or center), or back out. */
  const toggleZoom = React.useCallback(
    (at?: { x: number; y: number }) => {
      if (view.current.scale > 1.01) {
        view.current = { scale: 1, x: 0, y: 0 };
      } else {
        const m = at ?? { x: 0, y: 0 };
        const s = view.current.scale;
        const lim = bounds(TAP_ZOOM);
        view.current = {
          scale: TAP_ZOOM,
          x: clamp(m.x - (TAP_ZOOM / s) * (m.x - view.current.x), lim.x),
          y: clamp(m.y - (TAP_ZOOM / s) * (m.y - view.current.y), lim.y),
        };
      }
      swipe.current = { x: 0, y: 0 };
      apply(`transform 340ms ${EASE}`);
    },
    [apply],
  );

  // Desktop nicety: wheel / trackpad-pinch zooms about the cursor. Native
  // listener because React registers wheel passively (preventDefault no-ops).
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = view.current.scale;
      const next = Math.min(Math.max(s * Math.exp(-e.deltaY * 0.0022), 1), MAX_ZOOM);
      if (next === s) return;
      const m = rel(e.clientX, e.clientY);
      const lim = bounds(next);
      view.current = {
        scale: next,
        x: clamp(m.x - (next / s) * (m.x - view.current.x), lim.x),
        y: clamp(m.y - (next / s) * (m.y - view.current.y), lim.y),
      };
      apply();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [apply]);

  /**
   * Grabbing the image mid-animation must hold it where it visually is, not
   * where the animation was headed — read the truth back from the DOM.
   */
  const syncFromComputed = () => {
    const img = imgRef.current;
    if (!img) return;
    const t = getComputedStyle(img).transform;
    const m = t.match(/matrix(3d)?\(([^)]+)\)/);
    if (!m) return;
    const v = m[2].split(",").map(Number);
    const next = m[1]
      ? { scale: v[0], x: v[12], y: v[13] }
      : { scale: v[0], x: v[4], y: v[5] };
    if (next.scale <= 1.01) {
      view.current = { scale: 1, x: 0, y: 0 };
    } else {
      view.current = next;
    }
    swipe.current = { x: 0, y: 0 };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    // A primary pointer means a brand-new interaction — drop anything a
    // missed pointerup/cancel may have stranded in the map.
    if (e.isPrimary) pointers.current.clear();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      pinched.current = false;
      samples.current = [];
      syncFromComputed();
      apply(); // freeze any in-flight animation under the finger
      drag.current = {
        x: e.clientX,
        y: e.clientY,
        bx: view.current.x,
        by: view.current.y,
        dx: 0,
        dy: 0,
        moved: false,
      };
      setDragging(true);
    } else if (pts.length === 2) {
      // Fold any in-flight swipe into the base translation so nothing jumps
      // when the swipe becomes a pinch.
      view.current.x += swipe.current.x;
      view.current.y += swipe.current.y;
      swipe.current = { x: 0, y: 0 };
      drag.current = null;
      pinched.current = true;
      const [a, b] = pts;
      pinch.current = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        mid: rel((a.x + b.x) / 2, (a.y + b.y) / 2),
        raw: view.current.scale,
      };
    }
    // A 3rd+ finger is ignored; the pinch keeps tracking the first two.
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const mid = rel((a.x + b.x) / 2, (a.y + b.y) / 2);
      const p = pinch.current;
      if (p.dist > 0 && dist > 0) {
        p.raw *= dist / p.dist;
        const next = rubberScale(p.raw);
        const s = view.current.scale;
        // Keep the image point under the fingers' midpoint fixed while the
        // scale changes, and pan with the midpoint as it travels.
        const lim = bounds(next);
        view.current = {
          scale: next,
          x: rubber(mid.x - (next / s) * (p.mid.x - view.current.x), lim.x),
          y: rubber(mid.y - (next / s) * (p.mid.y - view.current.y), lim.y),
        };
        p.dist = dist;
        p.mid = mid;
        apply();
      }
      return;
    }

    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current.dx = dx;
    drag.current.dy = dy;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
    samples.current.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (samples.current.length > 6) samples.current.shift();
    if (view.current.scale > 1) {
      const lim = bounds(view.current.scale);
      view.current.x = rubber(drag.current.bx + dx, lim.x);
      view.current.y = rubber(drag.current.by + dy, lim.y);
    } else if (!pinched.current) {
      // Unzoomed: the image follows the finger, so a swipe reads as a slide.
      swipe.current = { x: dx, y: dy };
    }
    apply();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const remaining = [...pointers.current.values()];

    if (pinch.current) {
      if (remaining.length >= 2) {
        // One of 3+ fingers left — re-anchor the pinch to two that remain.
        const [a, b] = remaining;
        pinch.current.dist = Math.hypot(b.x - a.x, b.y - a.y);
        pinch.current.mid = rel((a.x + b.x) / 2, (a.y + b.y) / 2);
        return;
      }
      pinch.current = null;
      if (remaining.length === 1 && view.current.scale > 1) {
        // Pinch → one-finger pan, seamlessly.
        const pt = remaining[0];
        drag.current = {
          x: pt.x,
          y: pt.y,
          bx: view.current.x,
          by: view.current.y,
          dx: 0,
          dy: 0,
          moved: true,
        };
        samples.current = [];
        return;
      }
      drag.current = null;
      if (remaining.length === 0) setDragging(false);
      settle();
      return;
    }

    if (remaining.length > 0) return;
    setDragging(false);
    const d = drag.current;
    drag.current = null;
    if (!d) {
      if (pinched.current) settle();
      return;
    }

    // A tap (no real movement) toggles zoom into the tapped spot. Ignore the
    // second half of a double-tap so it can't zoom in and instantly back out.
    if (!d.moved) {
      if (e.timeStamp - lastTapAt.current > 350) {
        lastTapAt.current = e.timeStamp;
        toggleZoom(rel(e.clientX, e.clientY));
      }
      return;
    }

    if (view.current.scale > 1) {
      // A pinch that hands off to one finger can release overscaled — spring
      // back instead of gliding.
      if (view.current.scale > MAX_ZOOM) {
        settle();
        return;
      }
      // Pan release: glide along the release velocity, clamped to the edges.
      const lim = bounds(view.current.scale);
      const v = velocity(e.timeStamp);
      const speed = Math.hypot(v.x, v.y);
      let ms = 320;
      let tx = clamp(view.current.x, lim.x);
      let ty = clamp(view.current.y, lim.y);
      if (speed > 0.25) {
        tx = clamp(view.current.x + v.x * 260, lim.x);
        ty = clamp(view.current.y + v.y * 260, lim.y);
        ms = Math.min(340 + speed * 160, 620);
      }
      view.current.x = tx;
      view.current.y = ty;
      apply(`transform ${ms}ms ${EASE}`);
      return;
    }

    if (pinched.current) {
      settle();
      return;
    }

    // Unzoomed release: distance or a quick flick navigates / closes.
    const v = velocity(e.timeStamp);
    const horizontal = Math.abs(d.dx) > Math.abs(d.dy);
    if (
      horizontal &&
      count > 1 &&
      (Math.abs(d.dx) > SWIPE_NAV_PX ||
        (Math.abs(d.dx) > 24 && Math.abs(v.x) > FLICK_NAV_V))
    ) {
      go(index + (d.dx < 0 ? 1 : -1)); // go() resets the swipe state
      return;
    }
    if (!horizontal && (d.dy > SWIPE_CLOSE_PX || (d.dy > 40 && v.y > FLICK_CLOSE_V))) {
      onClose();
      return;
    }
    swipe.current = { x: 0, y: 0 }; // below threshold — spring back
    apply(`transform 260ms ${EASE}`);
  };

  const src = mediaUrl(images[index]?.mediaId, "original");

  // No `mounted` gate needed: the lightbox only renders after a user click
  // (post-hydration), so `document.body` is always available for the portal.
  return createPortal(
    <div
      // touch-none on the whole overlay: a pinch finger that lands on the
      // arrows/top bar must not let the browser hijack the gesture as a
      // page-pinch (which pointercancels ours mid-zoom).
      className="fixed inset-0 z-[70] flex touch-none flex-col bg-black/92 animate-in fade-in-0 duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — image viewer`}
    >
      {/* top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90">
        <span className="text-13 font-bold tabular-nums">
          {index + 1} / {count}
        </span>
        <CloseButton
          tone="overlay"
          onClick={onClose}
          aria-label="Close viewer"
        />
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
          style={{ cursor: zoomed ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              key={images[index]?.id ?? index}
              src={src}
              alt={images[index]?.altText ?? title}
              draggable={false}
              className="max-h-full max-w-full object-contain animate-in fade-in-0 duration-200"
              style={{ willChange: "transform" }}
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
          onClick={() => toggleZoom()}
          className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur transition-colors hover:bg-white/20"
        >
          {zoomed ? (
            <>
              <ZoomOut className="size-4" /> Reset
            </>
          ) : (
            <>
              <ZoomIn className="size-4" /> Pinch or tap to zoom
            </>
          )}
        </button>
      </div>

      {/* thumbnail strip */}
      {count > 1 && (
        <div
          ref={stripRef}
          // touch-pan-x re-enables horizontal thumb scrolling under the
          // overlay's touch-none (the strip itself implements the pan).
          className="no-scrollbar relative touch-pan-x overflow-x-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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
