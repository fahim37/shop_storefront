"use client";

/**
 * Ticking countdown section for vendor store pages. Client island — the
 * timer updates every second. To avoid a hydration mismatch (the server
 * renders at a different instant), digits render as placeholders until
 * mounted, then tick from the client clock.
 */
import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { StoreCountdownSection, StoreTheme } from "@/lib/api/types";
import { buttonStyles } from "@/components/store/store-theme";

function useCountdown(endsAt: string) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    const tick = () => setNow(Date.now());
    // First tick async (next frame) — hydration-safe and lint-compliant.
    const raf = window.requestAnimationFrame(tick);
    const t = window.setInterval(tick, 1000);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(t);
    };
  }, []);
  const target = Date.parse(endsAt);
  if (now === null || Number.isNaN(target)) {
    return { mounted: now !== null, expired: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const remaining = Math.max(0, target - now);
  return {
    mounted: true,
    expired: remaining === 0,
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1000) % 60),
  };
}

function TimeTile({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex w-16 flex-col items-center gap-0.5 py-2.5 sm:w-20"
      style={{
        borderRadius: "var(--sp-radius)",
        background: "color-mix(in srgb, var(--sp-fg) 6%, var(--sp-bg))",
        border: "1px solid color-mix(in srgb, var(--sp-fg) 12%, transparent)",
      }}
    >
      <span className="text-xl font-extrabold tabular-nums sm:text-2xl">{value}</span>
      <span className="text-[10px] font-semibold tracking-wider uppercase opacity-60">
        {label}
      </span>
    </div>
  );
}

export function CountdownBlock({
  section,
  theme,
}: {
  section: StoreCountdownSection;
  theme: StoreTheme;
}) {
  const t = useCountdown(section.endsAt);
  const fmt = (n: number) => (t.mounted ? String(n).padStart(2, "0") : "--");
  const button = section.button;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {section.heading ? (
        <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {section.heading}
        </h3>
      ) : null}
      {section.subheading ? (
        <p className="max-w-2xl text-sm opacity-80">{section.subheading}</p>
      ) : null}
      {t.mounted && t.expired ? (
        <p className="text-lg font-bold opacity-70">{section.expiredText}</p>
      ) : (
        <div className="flex gap-2 sm:gap-3" role="timer" aria-live="off">
          <TimeTile value={fmt(t.days)} label="Days" />
          <TimeTile value={fmt(t.hours)} label="Hrs" />
          <TimeTile value={fmt(t.minutes)} label="Min" />
          <TimeTile value={fmt(t.seconds)} label="Sec" />
        </div>
      )}
      {button ? (
        <div className="mt-1">
          {button.href.startsWith("/") ? (
            <Link
              href={button.href}
              className={cn(
                "inline-flex items-center justify-center px-6 py-3 text-15 font-semibold transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98]",
              )}
              style={buttonStyles(theme, button.variant)}
            >
              {button.label}
            </Link>
          ) : (
            <a
              href={button.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 text-15 font-semibold transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98]"
              style={buttonStyles(theme, button.variant)}
            >
              {button.label}
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}
