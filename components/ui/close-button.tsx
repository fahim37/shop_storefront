"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One close-affordance for every dismissable surface (dialogs, sheets, docks,
 * the lightbox): a subtly filled circle with a hairline border, X spins a
 * quarter turn on hover/press. `tone="overlay"` is for dark headers (navy
 * chat/assistant bars, the lightbox scrim); `default` sits on cards.
 */
export const closeButtonVariants = cva(
  "group inline-flex shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,border-color,color] duration-200 ease-out active:scale-[0.85] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none",
  {
    variants: {
      tone: {
        default:
          "border-border bg-muted/60 text-ink hover:border-primary/40 hover:bg-muted",
        overlay:
          "border-white/15 bg-white/10 text-white hover:border-white/30 hover:bg-white/20",
      },
      size: {
        sm: "size-8",
        md: "size-9",
      },
    },
    defaultVariants: { tone: "default", size: "md" },
  },
);

export interface CloseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof closeButtonVariants> {}

/**
 * Plain-button variant for non-Radix surfaces. For Radix Close primitives
 * pass `closeButtonClass(...)` + `<CloseButtonIcon />` instead so the
 * primitive keeps its own semantics.
 */
export const CloseButton = React.forwardRef<HTMLButtonElement, CloseButtonProps>(
  ({ className, tone, size, children, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(closeButtonVariants({ tone, size }), className)}
      {...props}
    >
      {children ?? <CloseButtonIcon />}
    </button>
  ),
);
CloseButton.displayName = "CloseButton";

export function closeButtonClass(
  opts?: VariantProps<typeof closeButtonVariants> & { className?: string },
) {
  return cn(
    closeButtonVariants({ tone: opts?.tone, size: opts?.size }),
    opts?.className,
  );
}

export function CloseButtonIcon({ className }: { className?: string }) {
  return (
    <X
      className={cn(
        "size-4.5 transition-transform duration-300 ease-spring group-hover:rotate-90 group-active:rotate-90",
        className,
      )}
    />
  );
}
