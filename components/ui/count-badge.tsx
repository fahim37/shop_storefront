"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Small count bubble for header action icons (cart, wishlist).
 *
 * - Springs in/out when the count crosses zero.
 * - Rolls the number on every change so increments feel alive.
 * - `pointer-events-none` so it never eats clicks meant for the icon button.
 * - Honors `prefers-reduced-motion` (renders a plain bubble, no transforms).
 *
 * Color is passed via `className` (e.g. `bg-amber text-blue-deep`).
 */
export function CountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const base = cn(
    "pointer-events-none absolute -right-2 -top-2 grid h-[18px] min-w-[18px] place-items-center overflow-hidden rounded-full px-1 text-[10px] font-extrabold leading-none tabular-nums",
    className,
  );

  if (reduce) {
    return count > 0 ? <span className={base}>{count}</span> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {count > 0 && (
        <motion.span
          key="badge"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 22 }}
          className={base}
        >
          <motion.span
            key={count}
            initial={{ y: -9, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {count}
          </motion.span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}
