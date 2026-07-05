import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { sectionIcon } from "@/components/home/blocks/section-icons";
import type { HomepagePromoCard } from "@/lib/api/types";

/* ----------------------------------------------------------------------------
 * Promo grid — 1–4 promo cards (admin-managed replacement for the hardcoded
 * "Sell on GCL" / "৳100 off first order" duo). Each card carries its own tone,
 * icon, copy, and CTA. Server component.
 * ------------------------------------------------------------------------- */

const TONES: Record<
  NonNullable<HomepagePromoCard["tone"]>,
  { panel: string; button: "soft" | "navy" }
> = {
  navy: { panel: "bg-navy text-white", button: "soft" },
  amber: { panel: "bg-amber text-blue-deep", button: "navy" },
  primary: { panel: "bg-primary text-white", button: "soft" },
};

const COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function PromoGrid({ cards }: { cards: HomepagePromoCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section
      className={cn(
        "wrap grid gap-3 sm:grid-cols-2 sm:gap-4",
        COLS[Math.min(cards.length, 4)] ?? "lg:grid-cols-2",
      )}
    >
      {cards.map((card, i) => {
        const tone = TONES[card.tone ?? "navy"] ?? TONES.navy;
        const Icon = sectionIcon(card.icon);
        return (
          <div
            key={`${card.title}-${i}`}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5 sm:gap-5 sm:px-7 sm:py-7",
              tone.panel,
            )}
          >
            <Icon className="size-6 shrink-0 sm:size-9" strokeWidth={1.4} />
            <div className="min-w-0 flex-1 basis-40">
              <h3 className="font-display text-sm font-extrabold sm:text-lg">
                {card.title}
              </h3>
              {card.subtitle && (
                <p className="mt-0.5 text-xs font-semibold opacity-75 sm:text-13">
                  {card.subtitle}
                </p>
              )}
            </div>
            {card.ctaLabel && card.ctaHref && (
              <Button asChild variant={tone.button} className="shrink-0">
                <Link href={card.ctaHref}>{card.ctaLabel}</Link>
              </Button>
            )}
          </div>
        );
      })}
    </section>
  );
}
