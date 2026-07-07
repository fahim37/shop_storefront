"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  closeButtonClass,
  CloseButtonIcon,
} from "@/components/ui/close-button";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[oklch(0.25_0.04_260/0.45)] backdrop-blur-[2px]",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-[420ms] data-[state=closed]:duration-300",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

// iOS-style decelerating curve: fast launch, long soft landing. Mirrored in
// the ease-[...] utilities below (Tailwind needs the literal in the class).
const SHEET_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const sheetVariants = cva(
  "fixed z-50 flex flex-col gap-0 bg-card shadow-[var(--shadow-panel)] will-change-transform data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-[420ms] data-[state=open]:ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=closed]:ease-[cubic-bezier(0.32,0.72,0,1)]",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 h-full w-full max-w-md border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        left: "inset-y-0 left-0 h-full w-full max-w-md border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        bottom:
          "inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        top: "inset-x-0 top-0 rounded-b-2xl border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
      },
    },
    defaultVariants: { side: "right" },
  },
);

/**
 * Finger drag-to-dismiss for horizontal sheets. The panel tracks the finger
 * 1:1 via inline transform writes (no React re-renders on move) while the
 * overlay dims proportionally; release settles with a velocity-aware
 * transition. `touch-action: pan-y` on the panel keeps vertical scrolling
 * native — the browser only lets horizontal-dominant gestures reach us and
 * pointercancels the rest, which doubles as our intent detection.
 */
function useSwipeToClose(
  enabled: boolean,
  dir: 1 | -1, // x direction that dismisses: -1 = left sheet, +1 = right sheet
  contentRef: React.RefObject<HTMLDivElement | null>,
  overlayRef: React.RefObject<HTMLDivElement | null>,
  dismissRef: React.RefObject<HTMLButtonElement | null>,
) {
  const drag = React.useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    claimed: false,
    width: 1,
    tx: 0,
    samples: [] as { t: number; x: number }[],
    settling: false,
    detach: null as (() => void) | null,
  });

  React.useEffect(() => () => drag.current.detach?.(), []);

  return (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!enabled || d.settling || d.detach || e.pointerType === "mouse" || !e.isPrimary)
      return;
    d.pointerId = e.pointerId;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.claimed = false;
    d.tx = 0;
    d.samples = [{ t: e.timeStamp, x: e.clientX }];

    const onMove = (ev: PointerEvent) => {
      const content = contentRef.current;
      if (ev.pointerId !== d.pointerId || !content) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (!d.claimed) {
        // Claim only clearly horizontal moves; vertical ones become native
        // scrolls and the browser pointercancels this tracker.
        if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        d.claimed = true;
        d.width = content.getBoundingClientRect().width || 1;
        // Cancel any running enter animation so inline transforms win. A
        // WAAPI-cancelled CSS animation stays dead until animation-name
        // changes, so the data-state=closed exit animation still plays —
        // and tw-animate's exit keyframe starts from the current computed
        // transform, i.e. exactly where the finger left the panel.
        for (const el of [content, overlayRef.current]) {
          if (!el) continue;
          for (const a of el.getAnimations()) a.cancel();
          el.style.transition = "none";
        }
      }
      const toward = dx * dir; // >0 = moving toward dismissal
      d.tx = toward > 0 ? dx : dx * 0.15; // rubber-band against the wrong way
      content.style.transform = `translate3d(${d.tx}px,0,0)`;
      const overlay = overlayRef.current;
      if (overlay)
        overlay.style.opacity = String(
          1 - Math.min(1, Math.max(0, toward) / d.width),
        );
      d.samples.push({ t: ev.timeStamp, x: ev.clientX });
      while (d.samples.length > 2 && ev.timeStamp - d.samples[0].t > 100)
        d.samples.shift();
    };

    const settle = (ev: PointerEvent, forceCancel: boolean) => {
      if (ev.pointerId !== d.pointerId) return;
      d.detach?.();
      d.pointerId = -1;
      const content = contentRef.current;
      if (!d.claimed || !content) return;
      d.claimed = false;

      // The finger dragged — don't let the release also "click" the link it
      // lands on. isTrusted guard: the programmatic dismiss click below must
      // still get through to Radix.
      const swallow = (click: Event) => {
        if (!click.isTrusted) return;
        click.preventDefault();
        click.stopPropagation();
      };
      content.addEventListener("click", swallow, true);
      window.setTimeout(
        () => content.removeEventListener("click", swallow, true),
        350,
      );

      const overlay = overlayRef.current;
      const first = d.samples[0];
      const last = d.samples[d.samples.length - 1];
      const velocity =
        last.t > first.t ? ((last.x - first.x) / (last.t - first.t)) * dir : 0;
      const progress = (d.tx * dir) / d.width;
      const dismiss =
        !forceCancel && (progress > 0.42 || (velocity > 0.5 && progress > 0.05));
      d.settling = true;

      if (dismiss) {
        // Finish the travel at (roughly) the fling's own speed.
        const ms = Math.round(
          Math.min(320, Math.max(130, (d.width * (1 - progress)) / Math.max(velocity, 0.7))),
        );
        content.style.transition = `transform ${ms}ms ${SHEET_EASE}`;
        content.style.transform = `translate3d(${dir * d.width}px,0,0)`;
        if (overlay) {
          overlay.style.transition = `opacity ${ms}ms linear`;
          overlay.style.opacity = "0";
        }
        window.setTimeout(() => {
          d.settling = false;
          dismissRef.current?.click();
        }, ms + 20);
      } else {
        content.style.transition = `transform 280ms ${SHEET_EASE}`;
        content.style.transform = "translate3d(0,0,0)";
        if (overlay) {
          overlay.style.transition = "opacity 200ms linear";
          overlay.style.opacity = "1";
        }
        window.setTimeout(() => {
          d.settling = false;
          for (const el of [content, overlay]) {
            if (!el) continue;
            el.style.transition = "";
            el.style.transform = "";
            el.style.opacity = "";
          }
        }, 300);
      }
    };

    const onUp = (ev: PointerEvent) => settle(ev, false);
    const onCancel = (ev: PointerEvent) => settle(ev, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    d.detach = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      d.detach = null;
    };
  };
}

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  hideClose?: boolean;
  /** Let a touch drag on the panel dismiss it (left/right sheets only). */
  swipeToClose?: boolean;
}

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      side = "right",
      className,
      children,
      hideClose = false,
      swipeToClose = false,
      onPointerDown,
      ...props
    },
    ref,
  ) => {
    const swipeEnabled = swipeToClose && (side === "left" || side === "right");
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const overlayRef = React.useRef<HTMLDivElement | null>(null);
    const dismissRef = React.useRef<HTMLButtonElement | null>(null);
    const composedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref)
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref],
    );
    const handleSwipeDown = useSwipeToClose(
      swipeEnabled,
      side === "left" ? -1 : 1,
      contentRef,
      overlayRef,
      dismissRef,
    );

    return (
      <SheetPortal>
        <SheetOverlay ref={overlayRef} />
        <DialogPrimitive.Content
          ref={composedRef}
          className={cn(
            sheetVariants({ side }),
            swipeEnabled && "touch-pan-y",
            className,
          )}
          onPointerDown={(e) => {
            onPointerDown?.(e);
            handleSwipeDown(e);
          }}
          {...props}
        >
          {children}
          {swipeEnabled && (
            <DialogPrimitive.Close
              ref={dismissRef}
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
            />
          )}
          {!hideClose && (
            <DialogPrimitive.Close
              aria-label="Close"
              className={closeButtonClass({
                className: "absolute right-4 top-4",
              })}
            >
              <CloseButtonIcon />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = DialogPrimitive.Content.displayName;

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 border-b border-border px-5 py-4", className)}
      {...props}
    />
  );
}

export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-auto border-t border-border px-5 py-4", className)}
      {...props}
    />
  );
}

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-display text-base font-extrabold tracking-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;
