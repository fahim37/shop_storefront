import { sectionIcon } from "@/components/home/blocks/section-icons";
import type { HomepageUspItem } from "@/lib/api/types";

/* ----------------------------------------------------------------------------
 * USP / trust strip — a row of icon + title + subtitle cells (admin-managed
 * replacement for the hardcoded "Cash on delivery / Authentic products / …"
 * strip). Server component; renders nothing when empty.
 * ------------------------------------------------------------------------- */

export function UspStrip({ items }: { items: HomepageUspItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="wrap">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((u, i) => {
          const Icon = sectionIcon(u.icon);
          return (
            <div
              key={`${u.title}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <Icon className="size-6 shrink-0 text-primary" strokeWidth={1.5} />
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">{u.title}</b>
                {u.subtitle && (
                  <span className="block truncate text-[11.5px] font-semibold text-faint">
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
