import Link from "next/link";
import { SectionHeader } from "@/components/layout/section-header";
import { categoryIcon } from "@/lib/category-icons";
import { resolveMediaPath } from "@/lib/media";
import type { CategoryNode } from "@/lib/api/types";

/* ----------------------------------------------------------------------------
 * Category circles — dense Daraz-style row of round category shortcuts.
 * Extracted from the home page so it can be driven by an admin block
 * (`category_circles`) as well as the designed fallback. Server component.
 * ------------------------------------------------------------------------- */

const TILE_TONES = [
  "bg-[oklch(0.93_0.035_255)] text-[oklch(0.38_0.12_258)]",
  "bg-[oklch(0.93_0.035_225)] text-[oklch(0.38_0.09_230)]",
  "bg-[oklch(0.94_0.03_95)] text-[oklch(0.42_0.09_80)]",
  "bg-[oklch(0.94_0.025_165)] text-[oklch(0.37_0.08_165)]",
  "bg-[oklch(0.94_0.02_280)] text-[oklch(0.4_0.1_278)]",
];

export interface CategoryCirclesProps {
  categories: CategoryNode[];
  title?: string;
  subtitle?: string;
}

export function CategoryCircles({
  categories,
  title = "Shop by category",
  subtitle = "Browse every department",
}: CategoryCirclesProps) {
  if (categories.length === 0) return null;
  return (
    <section className="wrap">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1 lg:justify-center lg:gap-9 lg:overflow-visible lg:pb-0">
        {categories.map((cat, i) => {
          const Icon = categoryIcon(cat.slug);
          return (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group flex w-[76px] shrink-0 flex-col items-center gap-2.5 lg:w-[88px]"
            >
              {cat.iconUrl ? (
                <span className="block size-16 overflow-hidden rounded-full shadow-[var(--shadow-card)] ring-1 ring-border transition-all group-hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-primary/50 lg:size-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaPath(cat.iconUrl)!}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full scale-[1.38] object-cover transition-transform duration-300 group-hover:scale-[1.48]"
                  />
                </span>
              ) : (
                <span
                  className={`flex size-16 items-center justify-center rounded-full transition-all group-hover:-translate-y-0.5 lg:size-20 ${TILE_TONES[i % TILE_TONES.length]}`}
                >
                  <Icon className="size-7 lg:size-8" strokeWidth={1.5} />
                </span>
              )}
              <b className="line-clamp-2 w-full text-center text-[12px] font-extrabold leading-tight text-ink group-hover:text-primary">
                {cat.name}
              </b>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
