import { sectionIcon } from "@/components/home/blocks/section-icons";
import type { HomepageUspItem } from "@/lib/api/types";

/* ----------------------------------------------------------------------------
 * USP / trust strip — a row of icon + title + subtitle cells (admin-managed
 * replacement for the hardcoded "Cash on delivery / Authentic products / …"
 * strip). Server component; renders nothing when empty.
 * ------------------------------------------------------------------------- */

/* Brand tint cycle: each cell pairs a soft wash with its stronger icon color,
 * walking the raw palette (blue → amber → green → deep blue) so any number of
 * admin-authored items stays on-brand. */
const TINTS = [
  { card: "bg-blue-soft", icon: "text-blue-strong" },
  { card: "bg-amber-soft", icon: "text-amber-deep" },
  { card: "bg-green-soft", icon: "text-green" },
  { card: "bg-blue-deep/10", icon: "text-blue-deep" },
];

export function UspStrip({ items }: { items: HomepageUspItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="wrap">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {items.map((u, i) => {
          const Icon = sectionIcon(u.icon);
          const tint = TINTS[i % TINTS.length];
          return (
            <div
              key={`${u.title}-${i}`}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 lg:gap-3 lg:px-4 lg:py-3.5 ${tint.card}`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full bg-white shadow-xs lg:size-10 ${tint.icon}`}
              >
                <Icon className="size-4 lg:size-5" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <b className="block truncate text-xs font-extrabold text-ink lg:text-[13px]">
                  {u.title}
                </b>
                {u.subtitle && (
                  <span className="block truncate text-[10.5px] font-semibold text-sub lg:text-[11.5px]">
                    {u.subtitle}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
