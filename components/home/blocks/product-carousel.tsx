"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useSteppedLoop } from "@/components/home/blocks/use-stepped-loop";
import { ProductCard, type CardProduct } from "@/components/product/product-card";

/* ----------------------------------------------------------------------------
 * Product carousel — desktop-only single-row rail that auto-advances one card
 * at a time, slowly, and wraps forward seamlessly (the first cards are cloned
 * after the last, so it never visibly rewinds). Pauses on hover/focus and
 * honors prefers-reduced-motion. Used by the homepage "Best sellers" / "New
 * arrivals" rails; mobile keeps the grid.
 * ------------------------------------------------------------------------- */

/** Cards visible per viewport — mirrors the 5-col desktop ProductGrid. */
const VISIBLE = 5;
/** Time each position holds before sliding on — slow, easy on the eyes. */
const STEP_MS = 4500;
/** Glide duration for a single one-card step. */
const GLIDE_MS = 800;

export function ProductCarousel({
  products,
  className,
}: {
  products: CardProduct[];
  className?: string;
}) {
  const count = products.length;
  const looping = count > VISIBLE;
  const { index, animate, pause, resume } = useSteppedLoop(
    looping ? count : 0,
    STEP_MS,
    GLIDE_MS,
  );
  // Clone one viewport's worth of head cards after the tail for the wrap.
  const slides = looping ? [...products, ...products.slice(0, VISIBLE)] : products;

  return (
    <div
      className={cn("overflow-hidden", className)}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
    >
      {/* 5 cards + 4 × 1rem gaps fill the row, so each card is 20% − 0.8rem
          and one step (card + gap) is 20% + 0.2rem. */}
      <div
        className="flex gap-4"
        style={{
          transform: `translateX(calc(${index} * (-20% - 0.2rem)))`,
          transition: animate
            ? `transform ${GLIDE_MS}ms cubic-bezier(0.33, 0, 0.2, 1)`
            : "none",
        }}
      >
        {slides.map((p, i) => (
          <div
            key={`${p.id}-${i >= count ? "clone" : "item"}`}
            inert={i >= count || undefined}
            className="w-[calc(20%-0.8rem)] shrink-0"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
