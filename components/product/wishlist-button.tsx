"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";
import { useToggleWishlist } from "@/lib/api/engagement";

/**
 * The single source of truth for the wishlist heart toggle — used on product
 * cards and the PDP buy panel. Behaviour is identical everywhere; only the
 * shell shape differs (passed via `className` / `heartClassName`).
 *
 * Feel:
 * - `useToggleWishlist` flips the fill state instantly (the add mutation is
 *   optimistic), so the colour change is immediate — no spinner, no wait.
 * - Tap gives a quick squish; adding plays a spring "pop" + a one-shot burst
 *   ring; removing plays a smaller squish. All gated on `prefers-reduced-motion`.
 */
export function WishlistButton({
  productId,
  className,
  heartClassName,
}: {
  productId: string;
  className?: string;
  heartClassName?: string;
}) {
  const { isWishlisted, toggle } = useToggleWishlist();
  const wished = isWishlisted(productId);
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const [burst, setBurst] = React.useState(0);

  function handleClick(e: React.MouseEvent) {
    // Heart can live inside clickable cards — keep the click to ourselves.
    e.preventDefault();
    e.stopPropagation();
    const adding = !wished;
    if (!reduce) {
      void controls.start(
        adding ? { scale: [1, 1.35, 0.92, 1] } : { scale: [1, 0.8, 1] },
        { duration: adding ? 0.35 : 0.2, ease: "easeOut" },
      );
      if (adding) setBurst((b) => b + 1);
    }
    toggle(productId);
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wished}
      whileTap={reduce ? undefined : { scale: 0.88 }}
      className={cn(
        // ::after pads the tap target ~8px past the visible shell so the
        // 32px card heart still meets the ~44px touch-target guideline.
        "relative flex items-center justify-center transition-colors after:absolute after:-inset-2 after:content-['']",
        className,
      )}
    >
      <motion.span
        animate={controls}
        className="relative flex items-center justify-center"
      >
        <Heart
          className={cn(
            "transition-colors duration-200",
            wished && "fill-red text-red",
            heartClassName,
          )}
          strokeWidth={2}
        />
        <AnimatePresence>
          {burst > 0 && (
            <motion.span
              key={burst}
              aria-hidden
              initial={{ scale: 0.5, opacity: 0.55 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-red"
            />
          )}
        </AnimatePresence>
      </motion.span>
    </motion.button>
  );
}
