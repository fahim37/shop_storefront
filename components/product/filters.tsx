"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useFilterParams } from "@/lib/use-filters";
import type { CategoryNode, FacetOption, Facets } from "@/lib/api/types";

export interface FilterProps {
  /** Facet aggregates over the BASE SET (drives every section). */
  facets?: Facets;
  subcategories?: CategoryNode[];
}

/** Extra knobs for the mobile sheet's footer CTA (live filtered count). */
export interface FilterSheetProps extends FilterProps {
  /** Products currently in the filtered grid (first N pages). */
  resultCount?: number;
  /** True when more pages exist, so the count renders as "N+". */
  resultHasMore?: boolean;
  /** True while the grid is (re)fetching — the CTA shows "Updating…". */
  resultLoading?: boolean;
}

const SECTION_HEADER = "font-display text-[13px] font-extrabold";
const COUNT_CLS = "ml-auto text-[11px] font-bold tabular-nums text-faint";
/**
 * Checkbox/label rows: full-row hover + a touch-friendly hit area. Kept inset
 * (no negative-margin overhang): the accordion content is overflow-hidden and
 * the brand list is a scroll container, so overhanging rows would get clipped
 * or summon a horizontal scrollbar.
 */
const ROW_CLS =
  "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-sub transition-colors hover:bg-muted";

/** A neutral swatch fallback when a color value carries no hex. */
const NEUTRAL_SWATCH = "oklch(0.85 0.01 258)";

/** Selected-count badge shown on a section header while it's collapsed. */
function SectionBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-blue-soft px-1.5 py-px text-[11px] font-extrabold tabular-nums text-primary">
      {count}
    </span>
  );
}

/* ----------------------------------------------------------------------- */
/* Price                                                                   */
/* ----------------------------------------------------------------------- */

/** paisa string -> whole taka number. */
function paisaToTaka(paisa: string): number {
  try {
    return Math.round(Number(BigInt(paisa)) / 100);
  } catch {
    return 0;
  }
}

/**
 * Round slider increment for a price range — a power of ten one order below
 * the range's magnitude (min ৳10), so bounds and drag stops land on round
 * numbers: a ৳790–৳6290 catalog shows ৳700–৳6300, stepping by ৳100.
 */
function priceStep(range: number): number {
  return 10 ** Math.max(1, Math.floor(Math.log10(range)) - 1);
}

function PriceFilter({ facets }: { facets?: Facets }) {
  const { get } = useFilterParams();
  const urlMin = get("minPrice");
  const urlMax = get("maxPrice");
  // Remount (resetting the draft inputs) whenever the URL price changes from
  // outside this control — chips, clear all, navigation. Avoids the
  // setState-in-effect anti-pattern entirely.
  return (
    <PriceFilterInner
      key={`${urlMin}|${urlMax}`}
      facets={facets}
      initialMin={urlMin}
      initialMax={urlMax}
    />
  );
}

function PriceFilterInner({
  facets,
  initialMin,
  initialMax,
}: {
  facets?: Facets;
  initialMin: string;
  initialMax: string;
}) {
  const { setParams } = useFilterParams();

  const bound = facets?.priceRange;
  const rawFloor = bound ? paisaToTaka(bound.minPaisa) : 0;
  const rawCeil = bound ? paisaToTaka(bound.maxPaisa) : 0;
  const hasRange = !!bound && rawCeil > rawFloor;
  // Snap the bounds outward to round numbers — exact catalog extremes like
  // ৳790–৳6290 read as noise; ৳700–৳6300 still contains every product.
  const step = hasRange ? priceStep(rawCeil - rawFloor) : 1;
  const floor = hasRange ? Math.floor(rawFloor / step) * step : 0;
  const ceil = hasRange ? Math.ceil(rawCeil / step) * step : 0;

  const [min, setMin] = React.useState(initialMin);
  const [max, setMax] = React.useState(initialMax);

  const sliderValue: [number, number] = [
    min ? Math.min(Math.max(floor, Number(min)), ceil) : floor,
    max ? Math.max(Math.min(ceil, Number(max)), floor) : ceil,
  ];

  const apply = (loRaw: string, hiRaw: string) => {
    let lo = loRaw === "" ? null : Number(loRaw);
    let hi = hiRaw === "" ? null : Number(hiRaw);
    // A reversed range is a typo, not a request for zero results.
    if (lo !== null && hi !== null && lo > hi) [lo, hi] = [hi, lo];
    setParams({
      // Drop a bound when it doesn't actually narrow the facet range.
      minPrice: lo !== null && lo > 0 && (!hasRange || lo > floor) ? String(lo) : null,
      maxPrice: hi !== null && hi > 0 && (!hasRange || hi < ceil) ? String(hi) : null,
    });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        apply(min, max);
      }}
    >
      {hasRange && (
        <Slider
          min={floor}
          max={ceil}
          step={step}
          value={sliderValue}
          onValueChange={([lo, hi]) => {
            setMin(String(lo));
            setMax(String(hi));
          }}
          onValueCommit={([lo, hi]) => apply(String(lo), String(hi))}
          aria-label="Price range"
        />
      )}
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          placeholder={hasRange ? `${floor}` : "Min ৳"}
          value={min}
          onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
          className="h-9 text-[13px]"
          aria-label="Minimum price (৳)"
        />
        <span className="text-faint">—</span>
        <Input
          inputMode="numeric"
          placeholder={hasRange ? `${ceil}` : "Max ৳"}
          value={max}
          onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
          className="h-9 text-[13px]"
          aria-label="Maximum price (৳)"
        />
        <Button type="submit" size="sm" variant="soft" className="shrink-0">
          Go
        </Button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------------- */
/* Rating rows                                                             */
/* ----------------------------------------------------------------------- */

function RatingStars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-deep">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i <= value ? "fill-amber-deep" : "text-[oklch(0.88_0.01_258)]",
          )}
          strokeWidth={1.6}
        />
      ))}
    </span>
  );
}

function RatingFilter({ facets }: { facets: Facets }) {
  const { get, setParams } = useFilterParams();
  const active = get("rating");
  // Always show buckets 4..1 (descending), with counts when present.
  const counts = new Map(facets.ratingCounts.map((r) => [r.min, r.count]));

  return (
    <div className="flex flex-col gap-1">
      {[4, 3, 2, 1].map((r) => {
        const count = counts.get(r) ?? 0;
        const selected = active === String(r);
        return (
          <button
            key={r}
            type="button"
            aria-pressed={selected}
            aria-label={`${r} stars and up`}
            onClick={() => setParams({ rating: selected ? null : r })}
            className={cn(
              "flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold transition-colors",
              selected ? "bg-blue-soft text-primary" : "text-sub hover:bg-muted",
            )}
          >
            <RatingStars value={r} />
            <span>&amp; up</span>
            <span className={COUNT_CLS}>{formatCompact(count)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Brand (multi-select, searchable when long)                              */
/* ----------------------------------------------------------------------- */

function BrandFilter({ facets }: { facets: Facets }) {
  const { getList, toggleInList } = useFilterParams();
  const selected = getList("brand");
  const [query, setQuery] = React.useState("");

  const brands = facets.brands;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? brands.filter((b) => b.name.toLowerCase().includes(q))
    : brands;

  return (
    <div className="flex flex-col gap-2">
      {brands.length > 8 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brands"
            className="h-9 pl-8 text-[13px]"
            aria-label="Search brands"
          />
        </div>
      )}
      {/* ~8 rows tall; longer lists scroll instead of stretching the rail. */}
      <div
        className="flex max-h-72 flex-col gap-0.5 overflow-y-auto overscroll-contain"
        role="group"
        aria-label="Brands"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-1.5 text-[12.5px] font-semibold text-faint">
            No brands match &ldquo;{query.trim()}&rdquo;
          </p>
        ) : (
          filtered.map((b) => (
            <label key={b.id} className={ROW_CLS}>
              <Checkbox
                className="size-[18px]"
                checked={selected.includes(b.id)}
                onCheckedChange={() => toggleInList("brand", b.id)}
              />
              <span className="truncate">{b.name}</span>
              <span className={COUNT_CLS}>{formatCompact(b.count)}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Option facets (color swatches + text chips)                            */
/* ----------------------------------------------------------------------- */

function ColorOption({ option }: { option: FacetOption }) {
  const { getList, toggleInList } = useFilterParams();
  const key = `opt_${option.key}`;
  const selected = getList(key);

  return (
    <div className="flex flex-wrap gap-2.5">
      {option.values.map((v) => {
        const isSel = selected.includes(v.value);
        return (
          <button
            key={v.value}
            type="button"
            title={`${v.value} (${v.count})`}
            aria-label={v.value}
            aria-pressed={isSel}
            onClick={() => toggleInList(key, v.value)}
            className={cn(
              "relative flex size-8 items-center justify-center rounded-full border border-border shadow-sm transition-transform hover:scale-105 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSel && "ring-2 ring-primary ring-offset-2 ring-offset-card",
            )}
            style={{ backgroundColor: v.hex ?? NEUTRAL_SWATCH }}
          >
            {isSel && (
              <Check
                className="size-4 text-white mix-blend-difference"
                strokeWidth={3}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

const TEXT_OPTION_LIMIT = 12;

function TextOption({ option }: { option: FacetOption }) {
  const { getList, toggleInList } = useFilterParams();
  const key = `opt_${option.key}`;
  const selected = getList(key);
  const [expanded, setExpanded] = React.useState(false);

  // Collapse very long value lists, but never hide a selected value.
  const overflow = option.values.slice(TEXT_OPTION_LIMIT);
  const visible = expanded
    ? option.values
    : [
        ...option.values.slice(0, TEXT_OPTION_LIMIT),
        ...overflow.filter((v) => selected.includes(v.value)),
      ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {visible.map((v) => {
          const isSel = selected.includes(v.value);
          return (
            <button
              key={v.value}
              type="button"
              aria-pressed={isSel}
              onClick={() => toggleInList(key, v.value)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                isSel
                  ? "border-primary bg-blue-soft text-primary"
                  : "border-border text-sub hover:border-primary/40 hover:bg-muted",
              )}
            >
              <span>{v.value}</span>
              <span className="text-[11px] font-bold tabular-nums text-faint">
                {formatCompact(v.count)}
              </span>
            </button>
          );
        })}
      </div>
      {overflow.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-[12px] font-extrabold text-primary hover:underline"
        >
          {expanded ? "Show less" : `Show ${overflow.length} more`}
        </button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Controls                                                                */
/* ----------------------------------------------------------------------- */

/** Pulsing placeholder rows shown while the facet query is in flight. */
function FiltersSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6 py-1" aria-hidden>
      {[3, 2, 4, 3].map((rows, i) => (
        <div key={i} className="space-y-3">
          <div className="h-3.5 w-24 rounded bg-muted" />
          {Array.from({ length: rows }).map((_, j) => (
            <div key={j} className="h-3 rounded bg-muted" style={{ width: `${88 - j * 14}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function FilterControls({ facets, subcategories }: FilterProps) {
  const { get, getList, getOptions, setParams } = useFilterParams();

  const inStock = get("instock") === "1";
  const onSale = get("sale") === "1";

  const hasBrands = !!facets && facets.brands.length > 0;
  const hasRating = !!facets && facets.ratingCounts.some((r) => r.count > 0);
  const hasPrice = !!facets?.priceRange;
  const options = React.useMemo(() => facets?.options ?? [], [facets]);

  // Per-section selected counts — surfaced on the headers so collapsed
  // sections still show what's active (matters most inside the sheet).
  const selectedOptions = getOptions();
  const priceCount = get("minPrice") || get("maxPrice") ? 1 : 0;
  const availCount = (inStock ? 1 : 0) + (onSale ? 1 : 0);
  const ratingCount = get("rating") ? 1 : 0;
  const brandCount = getList("brand").length;

  // Default-open every section that has content. The accordion stays
  // "uncontrolled until touched": we feed it the computed list until the user
  // toggles something, so sections opened by late-arriving facets aren't lost
  // (a plain defaultValue is captured before the facet query resolves).
  const computedOpen = React.useMemo(() => {
    const v = ["price", "availability"];
    if (hasRating) v.push("rating");
    if (hasBrands) v.push("brand");
    for (const o of options) v.push(`opt-${o.key}`);
    return v;
  }, [hasRating, hasBrands, options]);
  const [userOpen, setUserOpen] = React.useState<string[] | null>(null);

  return (
    <div className="flex flex-col">
      {subcategories && subcategories.length > 0 && (
        <section className="border-b border-border pb-4">
          <h4 className={cn(SECTION_HEADER, "mb-3")}>Subcategories</h4>
          <div className="flex flex-col gap-0.5">
            {subcategories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-sub hover:bg-muted hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {!facets ? (
        <FiltersSkeleton />
      ) : (
        <Accordion
          type="multiple"
          value={userOpen ?? computedOpen}
          onValueChange={setUserOpen}
        >
          {hasPrice && (
            <AccordionItem value="price">
              <AccordionTrigger>
                <span>
                  Price (৳)
                  <SectionBadge count={priceCount} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <PriceFilter facets={facets} />
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="availability">
            <AccordionTrigger>
              <span>
                Availability
                <SectionBadge count={availCount} />
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-1">
                <label className={ROW_CLS}>
                  <Checkbox
                    className="size-[18px]"
                    checked={inStock}
                    onCheckedChange={(c) => setParams({ instock: c ? "1" : null })}
                  />
                  <span>In stock only</span>
                  <span className={COUNT_CLS}>
                    {formatCompact(facets.inStockCount)}
                  </span>
                </label>
                <label className={ROW_CLS}>
                  <Checkbox
                    className="size-[18px]"
                    checked={onSale}
                    onCheckedChange={(c) => setParams({ sale: c ? "1" : null })}
                  />
                  <span>On sale</span>
                  <span className={COUNT_CLS}>
                    {formatCompact(facets.onSaleCount)}
                  </span>
                </label>
              </div>
            </AccordionContent>
          </AccordionItem>

          {hasRating && (
            <AccordionItem value="rating">
              <AccordionTrigger>
                <span>
                  Rating
                  <SectionBadge count={ratingCount} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <RatingFilter facets={facets} />
              </AccordionContent>
            </AccordionItem>
          )}

          {hasBrands && (
            <AccordionItem value="brand">
              <AccordionTrigger>
                <span>
                  Brand
                  <SectionBadge count={brandCount} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <BrandFilter facets={facets} />
              </AccordionContent>
            </AccordionItem>
          )}

          {options.map((o) => (
            <AccordionItem key={o.key} value={`opt-${o.key}`}>
              <AccordionTrigger>
                <span>
                  {o.key}
                  <SectionBadge count={selectedOptions[o.key]?.length ?? 0} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {o.kind === "color" ? (
                  <ColorOption option={o} />
                ) : (
                  <TextOption option={o} />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Sidebar / Sheet                                                         */
/* ----------------------------------------------------------------------- */

/** Desktop sticky filter rail (scrolls internally past the viewport). */
export function FilterSidebar(props: FilterProps) {
  return (
    <aside
      className={cn(
        "hidden h-max rounded-2xl border border-border bg-card p-5 lg:block",
        // Header (76px) + catbar (52px) + breathing room. The stable gutter
        // keeps content from shifting when the rail starts overflowing.
        "lg:sticky lg:top-36 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto lg:overscroll-contain lg:scrollbar-gutter-stable",
      )}
    >
      <FilterControls {...props} />
    </aside>
  );
}

/** Mobile "Filters" button → bottom sheet with a live-count CTA. */
export function FilterSheet({
  resultCount,
  resultHasMore,
  resultLoading,
  ...props
}: FilterSheetProps) {
  const { activeCount, clearAll } = useFilterParams();
  const [open, setOpen] = React.useState(false);

  const cta = resultLoading
    ? "Updating…"
    : typeof resultCount === "number"
      ? resultCount === 0
        ? "No matching products"
        : `Show ${formatCompact(resultCount)}${resultHasMore ? "+" : ""} ${
            resultCount === 1 ? "result" : "results"
          }`
      : "Show results";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="navy" size="sm" className="lg:hidden">
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 flex min-w-[18px] items-center justify-center rounded-full bg-amber px-1 text-[10px] text-blue-deep">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85dvh] max-h-[85dvh]">
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden />
        <SheetHeader className="border-b-0 py-3">
          <SheetTitle>
            Filters
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-blue-soft px-2 py-0.5 text-[11px] font-extrabold tabular-nums text-primary">
                {activeCount}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Narrow the product list by price, availability, rating, brand and
            more.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain border-t border-border px-5 pb-4">
          <FilterControls {...props} />
        </div>
        <SheetFooter className="flex items-center gap-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
          {activeCount > 0 && (
            <Button variant="outline" className="shrink-0" onClick={clearAll}>
              Reset
            </Button>
          )}
          <Button fullWidth variant="primary" onClick={() => setOpen(false)}>
            {cta}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ----------------------------------------------------------------------- */
/* Active filter chips                                                     */
/* ----------------------------------------------------------------------- */

/** Removable active-filter chips + clear all. */
export function ActiveFilterChips({ facets }: { facets?: Facets }) {
  const { get, getList, getOptions, setParams, toggleInList, clearAll, activeCount } =
    useFilterParams();
  if (activeCount === 0) return null;

  const chips: { key: string; label: string; clear: () => void }[] = [];

  // Brands (one chip per id, resolved to a name via the facet list).
  const brandNames = new Map(facets?.brands.map((b) => [b.id, b.name]) ?? []);
  for (const id of getList("brand")) {
    chips.push({
      key: `brand:${id}`,
      label: brandNames.get(id) ?? "Brand",
      clear: () => toggleInList("brand", id),
    });
  }

  // Price range.
  if (get("minPrice") || get("maxPrice")) {
    const min = get("minPrice");
    const max = get("maxPrice");
    chips.push({
      key: "price",
      label:
        min && max
          ? `৳${min} – ৳${max}`
          : min
            ? `From ৳${min}`
            : `Up to ৳${max}`,
      clear: () => setParams({ minPrice: null, maxPrice: null }),
    });
  }

  // Rating.
  if (get("rating")) {
    chips.push({
      key: "rating",
      label: `${get("rating")}★ & up`,
      clear: () => setParams({ rating: null }),
    });
  }

  // In stock / On sale.
  if (get("instock") === "1") {
    chips.push({
      key: "instock",
      label: "In stock",
      clear: () => setParams({ instock: null }),
    });
  }
  if (get("sale") === "1") {
    chips.push({
      key: "sale",
      label: "On sale",
      clear: () => setParams({ sale: null }),
    });
  }

  // Dynamic option values, prefixed with their group ("Size: M") so bare
  // values stay unambiguous next to other chips.
  for (const [optKey, values] of Object.entries(getOptions())) {
    for (const value of values) {
      chips.push({
        key: `opt:${optKey}:${value}`,
        label: `${optKey}: ${value}`,
        clear: () => toggleInList(`opt_${optKey}`, value),
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Active filters">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-label={`Remove filter: ${c.label}`}
          onClick={c.clear}
          className="group inline-flex min-h-8 items-center gap-1.5 rounded-full bg-blue-soft px-3 py-1.5 text-xs font-extrabold text-primary transition-colors hover:bg-blue-soft/70"
        >
          {c.label}
          <X
            className="size-3 transition-transform group-hover:scale-125"
            strokeWidth={3}
          />
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="min-h-8 px-1 text-xs font-extrabold text-primary hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
