"use client";

import * as React from "react";
import {
  Bike,
  Check,
  ClipboardCheck,
  Package,
  PackageX,
  Truck,
} from "lucide-react";
import { TRACKING_STEPS, currentStepIndex } from "@/lib/order-status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SubOrderStatus, TrackingSubOrder } from "@/lib/api/types";

/**
 * Animated order tracker: a progress rail that fills step-by-step with a
 * shine band, draw-in checkmarks, a pulsing current step, and a status
 * banner with an arrival chip. Completed steps keep the blue fill but wear
 * an amber ring; the
 * final "Delivered" step is rendered as completed (checked) rather than
 * "in progress", and the first time a delivered order is opened in a
 * session a confetti celebration plays. Horizontal on sm+ screens, a
 * vertical rail on mobile.
 */

const LAST_STEP = TRACKING_STEPS.length - 1;
const STEP_REVEAL_MS = 460;
const CELEBRATE_MS = 4200;

interface OrderTrackerProps {
  status: SubOrderStatus;
  cancelledAt: string | null;
  placedAt: string;
  /** Used to key the once-per-session delivered celebration. */
  orderNumber?: string;
  vendorName?: string | null;
  itemsCount?: number;
  tracking?: TrackingSubOrder;
}

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  size: number;
  color: string;
  round: boolean;
}

const CONFETTI_COLORS = [
  "var(--amber)",
  "var(--blue)",
  "var(--green)",
  "var(--red)",
  "var(--blue-deep)",
];

function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.7,
    duration: 2.1 + Math.random() * 1.4,
    drift: (Math.random() - 0.5) * 110,
    rotate: 360 + Math.random() * 540,
    size: 5 + Math.random() * 5,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: Math.random() > 0.6,
  }));
}

export function OrderTracker({
  status,
  cancelledAt,
  placedAt,
  orderNumber,
  vendorName,
  itemsCount,
  tracking,
}: OrderTrackerProps) {
  const exited =
    status === "cancelled" || status === "returned" || !!cancelledAt;
  const target = exited ? -1 : currentStepIndex(status);

  // Sequential reveal: steps light up one at a time until the real status is
  // reached; a later status change (refetch) animates the remaining steps.
  const [reveal, setReveal] = React.useState(-1);
  const revealRef = React.useRef(-1);

  React.useEffect(() => {
    if (target < 0) return;
    const timers: number[] = [];
    const schedule = (step: number, delay: number) =>
      timers.push(
        window.setTimeout(() => {
          revealRef.current = step;
          setReveal(step);
        }, delay),
      );
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const from = revealRef.current;
    if (reduced || target <= from) {
      schedule(target, 0);
    } else {
      for (let i = from + 1, k = 0; i <= target; i++, k++) {
        schedule(i, 350 + STEP_REVEAL_MS * k);
      }
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [target]);

  // Delivered celebration — plays once per session per order, after the
  // reveal sequence reaches the final step.
  const delivered = reveal === LAST_STEP;
  const [celebrate, setCelebrate] = React.useState(false);
  const [confetti, setConfetti] = React.useState<ConfettiPiece[]>([]);

  React.useEffect(() => {
    if (!delivered) return;
    const key = `gcl:order-celebrated:${orderNumber ?? "order"}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Storage unavailable (private mode etc.) — still celebrate this once.
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Small delay so the final step's check draws in before confetti falls.
    const start = window.setTimeout(() => {
      setConfetti(makeConfetti(26));
      setCelebrate(true);
    }, 250);
    const stop = window.setTimeout(
      () => setCelebrate(false),
      250 + CELEBRATE_MS,
    );
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [delivered, orderNumber]);

  if (exited) {
    const tone = status === "returned" ? "returned" : "cancelled";
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red/30 bg-red/5 px-4 py-4 text-red sm:px-5">
        <PackageX className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-display text-sm font-extrabold">Order {tone}</p>
          <p className="mt-0.5 text-sm text-sub">
            {cancelledAt
              ? `This order was cancelled on ${formatDate(cancelledAt)}.`
              : `This order has been ${tone} and is no longer in transit.`}
          </p>
        </div>
      </div>
    );
  }

  const times = stepTimes(placedAt, tracking);
  const pct = Math.max(reveal, 0) / LAST_STEP;
  // The banner reflects the real status from the first frame (the animated
  // `reveal` only drives the rail) so it doesn't flick through every state
  // while the steps fill in.
  const stage = Math.max(target, 0);
  const atFinal = target === LAST_STEP;
  const banner = bannerCopy(stage, vendorName, itemsCount);
  const chip = etaChip(target, times[LAST_STEP]);
  const StageIcon = BANNER_ICONS[stage] ?? Check;

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      {/* Confetti overlay (delivered, first view this session) */}
      {celebrate && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        >
          {confetti.map((p, i) => (
            <span
              key={i}
              className="absolute -top-2"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.round ? p.size : p.size * 1.7,
                background: p.color,
                borderRadius: p.round ? 9999 : 2,
                ["--cx" as string]: `${p.drift}px`,
                ["--cr" as string]: `${p.rotate}deg`,
                animation: `tracker-confetti ${p.duration}s cubic-bezier(.2,.5,.4,1) ${p.delay}s both`,
              }}
            />
          ))}
        </div>
      )}

      {/* Horizontal rail (sm+) */}
      <div className="relative hidden px-4 pb-6 pt-8 sm:block sm:px-6">
        <div className="relative">
          {/* Base line + animated fill (steps are 5 equal columns, so the
              centers sit at 10% / 30% / 50% / 70% / 90%). */}
          <div className="absolute left-[10%] right-[10%] top-[21px] h-1 rounded-full bg-line" />
          <div
            className="absolute left-[10%] top-[21px] h-1 overflow-hidden rounded-full bg-[linear-gradient(90deg,var(--blue-strong),var(--blue))] transition-[width] duration-700 ease-[cubic-bezier(.6,0,.2,1)]"
            style={{ width: `${pct * 80}%` }}
          >
            <div className="absolute inset-0 animate-[tracker-shine-x_1.8s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)]" />
          </div>

          <ol className="relative z-[2] flex">
            {TRACKING_STEPS.map((step, i) => {
              // The final step never sits "in progress": reaching it means
              // the package was handed over, so it renders checked.
              const done = reveal > i || (reveal === i && i === LAST_STEP);
              const current = reveal === i && i !== LAST_STEP;
              return (
                <li
                  key={step.key}
                  aria-current={
                    reveal === i ? "step" : undefined
                  }
                  className="flex flex-1 flex-col items-center gap-3"
                >
                  <StepDot done={done} current={current} />
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className={cn(
                        "px-0.5 text-center text-sm leading-tight transition-colors duration-500",
                        current
                          ? "font-extrabold text-primary"
                          : done
                            ? "font-semibold text-ink"
                            : "font-medium text-sub",
                      )}
                    >
                      {step.label}
                    </span>
                    {reveal >= i && times[i] && (
                      <span className="text-center text-xs font-medium text-sub">
                        {stepTime(times[i])}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Vertical rail (mobile) */}
      <div className="relative px-4 py-5 sm:hidden">
        <div className="relative">
          {/* The rail sits after a 56px date column + 12px gap; the 28px dot's
              center lands at 82px, so the 4px line is centered at left-20 (80px).
              The track spans from the first dot's center to the last one's. */}
          <div className="absolute bottom-[14px] left-20 top-[14px] w-1 rounded-full bg-line" />
          <div
            className="absolute left-20 top-[14px] w-1 overflow-hidden rounded-full bg-[linear-gradient(180deg,var(--blue-strong),var(--blue))] transition-[height] duration-700 ease-[cubic-bezier(.6,0,.2,1)]"
            style={{ height: `calc((100% - 28px) * ${pct})` }}
          >
            <div className="absolute inset-0 animate-[tracker-shine-y_1.8s_ease-in-out_infinite] bg-[linear-gradient(180deg,transparent,rgba(255,255,255,.55),transparent)]" />
          </div>

          <ol className="relative z-[2] space-y-6">
            {TRACKING_STEPS.map((step, i) => {
              const done = reveal > i || (reveal === i && i === LAST_STEP);
              const current = reveal === i && i !== LAST_STEP;
              const active = reveal >= i;
              return (
                <li
                  key={step.key}
                  aria-current={reveal === i ? "step" : undefined}
                  className="flex items-start gap-3"
                >
                  {/* Date / time (left column) */}
                  <div className="w-14 shrink-0 pt-0.5 text-right">
                    {active && times[i] && (
                      <>
                        <p
                          className={cn(
                            "text-xs font-semibold leading-tight",
                            done || current ? "text-ink" : "text-sub",
                          )}
                        >
                          {stepDay(times[i]!)}
                        </p>
                        <p className="text-11 font-medium leading-tight text-sub">
                          {stepClock(times[i]!)}
                        </p>
                      </>
                    )}
                  </div>

                  <StepDot done={done} current={current} compact />

                  {/* Status + subtext (right column) */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p
                      className={cn(
                        "text-sm leading-tight transition-colors duration-500",
                        current
                          ? "font-extrabold text-primary"
                          : done
                            ? "font-semibold text-ink"
                            : "font-medium text-sub",
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-snug text-sub",
                        !active && "opacity-50",
                      )}
                    >
                      {STEP_DESC[i]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Status banner — stage icon + stable copy; tinted green once delivered */}
      <div
        className={cn(
          "flex flex-col gap-3 border-t border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-7",
          atFinal ? "bg-green-soft/40" : "bg-surface",
        )}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              atFinal ? "bg-green text-white" : "bg-blue-soft text-primary",
              celebrate &&
                "animate-[tracker-celebrate-pop_.55s_cubic-bezier(.34,1.56,.64,1)_.2s_both]",
            )}
          >
            <StageIcon className="size-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-display text-base font-bold text-ink">
                {banner.title}
              </p>
              {!atFinal && (
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 animate-[tracker-blink_1.6s_ease-in-out_infinite] rounded-full bg-green"
                />
              )}
            </div>
            <p className="text-13 font-medium text-sub">{banner.desc}</p>
          </div>
        </div>
        {chip && (
          <span
            className={cn(
              "self-start whitespace-nowrap rounded-full bg-accent px-4.5 py-2 text-13 font-extrabold text-accent-foreground shadow-[0_4px_12px_rgb(245_179_30/0.35)] sm:self-auto",
              celebrate &&
                "animate-[tracker-celebrate-pop_.55s_cubic-bezier(.34,1.56,.64,1)_.35s_both]",
            )}
          >
            {chip}
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StepDot({
  done,
  current,
  compact = false,
}: {
  done: boolean;
  current: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("relative shrink-0", compact ? "size-7" : "size-11.5")}>
      {current && (
        <>
          <div className="absolute inset-0 animate-[tracker-pulse_1.8s_ease-out_infinite] rounded-full bg-primary" />
          {!compact && (
            <div className="absolute -inset-2 animate-[tracker-spin_10s_linear_infinite] rounded-full border-2 border-dashed border-primary/40" />
          )}
        </>
      )}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full transition-colors duration-500",
          compact ? "border-2" : "border-[2.5px]",
          done
            ? "border-accent bg-primary"
            : current
              ? "border-primary bg-card"
              : "border-border bg-card",
        )}
      >
        {done ? (
          <svg
            width={compact ? 14 : 20}
            height={compact ? 14 : 20}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M5.5 12.5l4.2 4.2L18.5 8"
              stroke="#fff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: 24,
                animation:
                  "tracker-check .5s .15s cubic-bezier(.5,0,.3,1) forwards",
              }}
            />
          </svg>
        ) : current ? (
          <div
            className={cn(
              "animate-[tracker-pop_.4s_cubic-bezier(.3,.7,.2,1.4)_both] rounded-full bg-primary",
              compact ? "size-2" : "size-3.5",
            )}
          />
        ) : (
          <div
            className={cn(
              "rounded-full bg-hairline",
              compact ? "size-1.5" : "size-2.5",
            )}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Best-known timestamp per tracking step, from the order + shipment data. */
function stepTimes(
  placedAt: string,
  tracking: TrackingSubOrder | undefined,
): (string | null)[] {
  const shipment = tracking?.shipment;
  const event = (type: string) =>
    shipment?.events.find((e) => e.eventType === type)?.at ?? null;
  return [
    placedAt,
    event("packed") ?? event("vendor_confirmed"),
    shipment?.arrivedAtHub ?? event("picked_up"),
    shipment?.dispatchedAt ?? event("dispatched_from_hub"),
    shipment?.deliveredAt ?? event("delivered"),
  ];
}

/** "3 Jul · 10:24 AM" — compact caption under a step. */
function stepTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

/** "3 Jul" — date half for the mobile rail's left column. */
function stepDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "10:24 AM" — time half for the mobile rail's left column. */
function stepClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Stage icon for the status banner, indexed like TRACKING_STEPS. */
const BANNER_ICONS = [ClipboardCheck, Package, Truck, Bike, Check] as const;

/** One-line subtext shown under each step label on the mobile rail. */
const STEP_DESC = [
  "We've received your order.",
  "The seller is preparing your items.",
  "Your package is on the move.",
  "Your rider is on the way to you.",
  "Package handed over — enjoy!",
];

function bannerCopy(
  step: number,
  vendorName: string | null | undefined,
  itemsCount: number | undefined,
): { title: string; desc: string } {
  const vendor = vendorName ?? "The seller";
  const items =
    itemsCount && itemsCount > 0
      ? `your ${itemsCount} item${itemsCount === 1 ? "" : "s"}`
      : "your items";
  switch (step) {
    case 0:
      return {
        title: "Order placed",
        desc: "We've received your order — the seller will confirm it shortly.",
      };
    case 1:
      return { title: "Packing your items", desc: `${vendor} is packing ${items}.` };
    case 2:
      return {
        title: "On its way",
        desc: "Your package is moving through our delivery network.",
      };
    case 3:
      return {
        title: "Out for delivery",
        desc: "Your rider is nearby — keep your phone handy.",
      };
    default:
      return {
        title: "Delivered",
        desc: "Package handed over. Enjoy your new gear!",
      };
  }
}

/** Arrival chip: only shown when we can say something truthful. */
function etaChip(reveal: number, deliveredAt: string | null): string | null {
  if (reveal >= LAST_STEP) {
    return deliveredAt ? `Delivered ${stepTime(deliveredAt)}` : "Delivered";
  }
  if (reveal === LAST_STEP - 1) return "Arriving today";
  return null;
}
