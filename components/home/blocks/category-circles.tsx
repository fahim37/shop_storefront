"use client";

import { createElement } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/layout/section-header";
import { useSteppedLoop } from "@/components/home/blocks/use-stepped-loop";
import { categoryIcon } from "@/lib/category-icons";
import { resolveMediaPath } from "@/lib/media";
import type { CategoryNode } from "@/lib/api/types";

/* ----------------------------------------------------------------------------
 * Category circles — dense Daraz-style row of round category shortcuts,
 * auto-advancing one circle at a time (same stepped pulse as the product
 * carousels) on every screen size. The list is repeated enough times that the
 * viewport is always full, and the wrap is forward-only (never rewinds).
 * Pauses on hover/focus; honors prefers-reduced-motion.
 * ------------------------------------------------------------------------- */

const TILE_TONES = [
  "bg-[oklch(0.93_0.035_255)] text-[oklch(0.38_0.12_258)]",
  "bg-[oklch(0.93_0.035_225)] text-[oklch(0.38_0.09_230)]",
  "bg-[oklch(0.94_0.03_95)] text-[oklch(0.42_0.09_80)]",
  "bg-[oklch(0.94_0.025_165)] text-[oklch(0.37_0.08_165)]",
  "bg-[oklch(0.94_0.02_280)] text-[oklch(0.4_0.1_278)]",
];

/** Desktop footprint of one item (88px circle column + 36px gap) — the step
 * sizes live in the `--cc-step` CSS variable on the track below. */
const ITEM_WIDTH_LG_PX = 124;
/** Widest content rail the repeated list has to cover at max shift. */
const WRAP_PX = 1280;
/** Hold time per position / glide duration — slow and subtle. */
const STEP_MS = 4500;
const GLIDE_MS = 700;

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
  // Enough extra copies that the viewport stays full at the deepest shift
  // (index === count, i.e. one full list scrolled past).
  const extraCopies = Math.max(
    1,
    Math.ceil(WRAP_PX / (Math.max(count, 1) * ITEM_WIDTH_LG_PX)),
  );
  const copies = 1 + extraCopies;
  const { index, animate, pause, resume } = useSteppedLoop(
    count,
    STEP_MS,
    GLIDE_MS,
  );

  if (count === 0) return null;

  return (
    <section className="wrap">
      <SectionHeader title={title} subtitle={subtitle} />
      <div
        className="-mx-4 overflow-hidden py-1 lg:mx-0"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocusCapture={pause}
        onBlurCapture={resume}
      >
        {/* One step = circle column + gap: 76+16px on mobile, 88+36px on lg. */}
        <div
          className="flex w-max gap-4 [--cc-step:92px] lg:gap-9 lg:[--cc-step:124px]"
          style={{
            transform: `translateX(calc(var(--cc-step) * -${index}))`,
            transition: animate
              ? `transform ${GLIDE_MS}ms cubic-bezier(0.33, 0, 0.2, 1)`
              : "none",
          }}
        >
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
      inert={clone || undefined}
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
