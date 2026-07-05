"use client";

import { createElement, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/layout/section-header";
import { categoryIcon } from "@/lib/category-icons";
import { resolveMediaPath } from "@/lib/media";
import type { CategoryNode } from "@/lib/api/types";

/* ----------------------------------------------------------------------------
 * Category circles — dense Daraz-style row of round category shortcuts in a
 * native horizontal scroller: swipe it with a finger, drag it with the mouse,
 * or just wait — it auto-advances one circle at a time like the product
 * rails. The list is repeated enough times that manual flicks always have
 * runway, and while idle the scroll position is rewound by whole list widths
 * (invisible — the content is periodic) so the forward loop never hits the
 * end. Autoplay pauses on hover/focus and holds off after any manual
 * scroll; honors prefers-reduced-motion (no autoplay, manual scroll works).
 * ------------------------------------------------------------------------- */

const TILE_TONES = [
  "bg-[oklch(0.93_0.035_255)] text-[oklch(0.38_0.12_258)]",
  "bg-[oklch(0.93_0.035_225)] text-[oklch(0.38_0.09_230)]",
  "bg-[oklch(0.94_0.03_95)] text-[oklch(0.42_0.09_80)]",
  "bg-[oklch(0.94_0.025_165)] text-[oklch(0.37_0.08_165)]",
  "bg-[oklch(0.94_0.02_280)] text-[oklch(0.4_0.1_278)]",
];

/** Mobile footprint of one item (76px circle column + 16px gap) — the
 * smallest step, used to size the repeated list conservatively. */
const ITEM_STEP_MIN_PX = 92;
/** Forward runway (beyond one full list) a manual flick can travel before
 * the idle rewind pulls the position back into the first copy. */
const RUNWAY_PX = 2560;
/** Hold time per position / glide duration — slow and subtle. */
const STEP_MS = 4500;
const GLIDE_MS = 700;
/** How long autoplay stays out of the way after the user scrolls or drags. */
const HOLD_MS = 6000;
/** Mouse movement beyond this is a drag, not a click. */
const DRAG_THRESHOLD_PX = 5;

export interface CategoryCirclesProps {
  categories: CategoryNode[];
  title?: string;
  subtitle?: string;
}

export function CategoryCircles({
  categories,
  title = "Shop by category",
  subtitle = "Browse every department",
}: CategoryCirclesProps) {
  const count = categories.length;
  // Real list + enough repeats that the viewport stays full through RUNWAY_PX
  // of manual forward scrolling past one full list.
  const copies =
    1 +
    Math.max(
      2,
      Math.ceil(RUNWAY_PX / (Math.max(count, 1) * ITEM_STEP_MIN_PX)),
    );

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false); // hover / focus within the strip
  const holdUntilRef = useRef(0); // epoch ms; autoplay waits after manual input
  const gestureRef = useRef(false); // a pointer is currently down on the strip
  const glideRaf = useRef(0); // rAF id of the in-flight autoplay glide, 0 = none
  const dragRef = useRef({
    pointerId: -1,
    lastX: 0,
    travelled: 0,
    capturing: false,
  });
  const suppressClickRef = useRef(false);

  const stopGlide = useCallback(() => {
    if (glideRaf.current) cancelAnimationFrame(glideRaf.current);
    glideRaf.current = 0;
  }, []);

  const holdAutoplay = useCallback(() => {
    holdUntilRef.current = Date.now() + HOLD_MS;
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);
  const resume = useCallback(() => {
    pausedRef.current = false;
  }, []);

  // Autoplay: one item-step per interval, eased by rAF so the pulse matches
  // the transform-based product rails. Steps only while truly idle.
  useEffect(() => {
    if (count < 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = scrollerRef.current;
    if (!el) return;

    // Invisible because the content repeats with period `listWidth`; only
    // called while idle so it never fights a gesture or scroll momentum.
    const rewind = () => {
      const listWidth = el.scrollWidth / copies;
      if (listWidth > 0 && el.scrollLeft >= listWidth)
        el.scrollLeft -= listWidth * Math.floor(el.scrollLeft / listWidth);
    };

    const timer = setInterval(() => {
      if (
        pausedRef.current ||
        gestureRef.current ||
        glideRaf.current ||
        Date.now() < holdUntilRef.current
      )
        return;
      rewind();
      const track = el.firstElementChild;
      const a = track?.children[0] as HTMLElement | undefined;
      const b = track?.children[1] as HTMLElement | undefined;
      const step = a && b ? b.offsetLeft - a.offsetLeft : 0;
      if (step <= 0) return;
      const from = el.scrollLeft;
      const start = performance.now();
      const frame = (now: number) => {
        const p = Math.min(1, (now - start) / GLIDE_MS);
        const eased = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
        el.scrollLeft = from + step * eased;
        glideRaf.current = p < 1 ? requestAnimationFrame(frame) : 0;
      };
      glideRaf.current = requestAnimationFrame(frame);
    }, STEP_MS);

    // Once momentum from a flick settles, pull the position back into the
    // first list copy. (No-op where scrollend is unsupported — the pre-step
    // rewind above covers it.)
    const onScrollEnd = () => {
      if (!gestureRef.current && !glideRaf.current) rewind();
    };
    el.addEventListener("scrollend", onScrollEnd);
    return () => {
      clearInterval(timer);
      el.removeEventListener("scrollend", onScrollEnd);
      stopGlide();
    };
  }, [count, copies, stopGlide]);

  // Touch scrolling is native; these pointer handlers add mouse drag-to-scroll
  // and the bookkeeping that keeps autoplay from fighting either gesture.
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      stopGlide();
      holdAutoplay();
      gestureRef.current = true;
      suppressClickRef.current = false;
      if (e.pointerType === "mouse" && e.button === 0) {
        dragRef.current = {
          pointerId: e.pointerId,
          lastX: e.clientX,
          travelled: 0,
          capturing: false,
        };
      }
    },
    [holdAutoplay, stopGlide],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (drag.pointerId !== e.pointerId) return;
      const el = scrollerRef.current;
      if (!el) return;
      const dx = e.clientX - drag.lastX;
      drag.lastX = e.clientX;
      drag.travelled += Math.abs(dx);
      // Capture only once movement clears the click threshold, so plain
      // clicks keep targeting the link underneath.
      if (!drag.capturing) {
        if (drag.travelled < DRAG_THRESHOLD_PX) return;
        drag.capturing = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* pointer already gone */
        }
      }
      el.scrollLeft -= dx;
      holdAutoplay();
    },
    [holdAutoplay],
  );

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      gestureRef.current = false;
      holdAutoplay();
      const drag = dragRef.current;
      if (drag.pointerId !== e.pointerId) return;
      if (drag.capturing) suppressClickRef.current = true;
      dragRef.current = { pointerId: -1, lastX: 0, travelled: 0, capturing: false };
    },
    [holdAutoplay],
  );

  // Swallow the click that follows a mouse drag so releasing over a link
  // doesn't navigate.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onWheel = useCallback(() => {
    stopGlide();
    holdAutoplay();
  }, [holdAutoplay, stopGlide]);

  if (count === 0) return null;

  return (
    <section className="wrap">
      <SectionHeader title={title} subtitle={subtitle} />
      <div
        ref={scrollerRef}
        className="no-scrollbar -mx-4 select-none overflow-x-auto overscroll-x-contain py-1 lg:mx-0"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocusCapture={pause}
        onBlurCapture={resume}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
        onWheel={onWheel}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="flex w-max gap-4 lg:gap-9">
          {Array.from({ length: copies }).map((_, copy) =>
            categories.map((cat, i) => (
              <CategoryItem
                key={`${copy}-${cat.id}`}
                cat={cat}
                tone={TILE_TONES[i % TILE_TONES.length]}
                clone={copy > 0}
              />
            )),
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryItem({
  cat,
  tone,
  clone,
}: {
  cat: CategoryNode;
  tone: string;
  clone: boolean;
}) {
  return (
    <Link
      href={`/category/${cat.slug}`}
      // Clones are reachable by scrolling, so they must stay clickable —
      // hide them from assistive tech and the tab order only.
      aria-hidden={clone || undefined}
      tabIndex={clone ? -1 : undefined}
      className="group flex w-[76px] shrink-0 flex-col items-center gap-2.5 lg:w-[88px]"
    >
      {cat.iconUrl ? (
        <span className="block size-16 overflow-hidden rounded-full shadow-[var(--shadow-card)] ring-1 ring-border transition-all group-hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-primary/50 lg:size-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveMediaPath(cat.iconUrl)!}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full scale-[1.38] object-cover transition-transform duration-300 group-hover:scale-[1.48]"
          />
        </span>
      ) : (
        <span
          className={`flex size-16 items-center justify-center rounded-full transition-all group-hover:-translate-y-0.5 lg:size-20 ${tone}`}
        >
          {/* createElement: the icon is a stable lookup from a static map,
              not a component defined during render (same as mega-menu). */}
          {createElement(categoryIcon(cat.slug), {
            className: "size-7 lg:size-8",
            strokeWidth: 1.5,
          })}
        </span>
      )}
      <b className="line-clamp-2 w-full text-center text-[12px] font-extrabold leading-tight text-ink group-hover:text-primary">
        {cat.name}
      </b>
    </Link>
  );
}
