"use client";

import * as React from "react";
import Link from "next/link";
import { Check, SlidersHorizontal, Star, X } from "lucide-react";
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
  /**
   * Kept for compatibility. Rating now renders whenever the facet has data on
   * BOTH pages, so this prop no longer gates it.
   */
  showRating?: boolean;
}

const SECTION_HEADER = "font-display text-[13px] font-extrabold";
const COUNT_CLS = "ml-auto text-[11px] font-bold tabular-nums text-faint";

/** A neutral swatch fallback when a color value carries no hex. */
const NEUTRAL_SWATCH = "oklch(0.85 0.01 258)";

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
  const floor = bound ? paisaToTaka(bound.minPaisa) : 0;
  const ceil = bound ? paisaToTaka(bound.maxPaisa) : 0;
  const hasRange = !!bound && ceil > floor;

  const [min, setMin] = React.useState(initialMin);
  const [max, setMax] = React.useState(initialMax);

  const sliderValue: [number, number] = [
    min ? Math.max(floor, Number(min)) : floor,
    max ? Math.min(ceil, Number(max)) : ceil,
  ];

  const apply = (lo: string, hi: string) => {
    setParams({
      // Drop the bound when it equals the facet floor/ceiling (no real filter).
      minPrice: lo && Number(lo) > floor ? lo : null,
      maxPrice: hi && Number(hi) < ceil ? hi : null,
    });
  };

  return (
    <div className="space-y-4">
      {hasRange && (
        <Slider
          min={floor}
          max={ceil}
          step={Math.max(1, Math.round((ceil - floor) / 100))}
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
        <Button
          size="sm"
          variant="soft"
          onClick={() => apply(min, max)}
          className="shrink-0"
        >
          Go
        </Button>
      </div>
    </div>
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
            onClick={() => setParams({ rating: selected ? null : r })}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold",
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
/* Brand (multi-select)                                                    */
/* ----------------------------------------------------------------------- */

function BrandFilter({ facets }: { facets: Facets }) {
  const { getList, toggleInList } = useFilterParams();
  const selected = getList("brand");
  const [expanded, setExpanded] = React.useState(false);

  const brands = facets.brands;
  const visible = expanded ? brands : brands.slice(0, 8);

  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((b) => (
        <label
          key={b.id}
          className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-sub"
        >
          <Checkbox
            className="size-[18px]"
            checked={selected.includes(b.id)}
            onCheckedChange={() => toggleInList("brand", b.id)}
          />
          <span className="truncate">{b.name}</span>
          <span className={COUNT_CLS}>{formatCompact(b.count)}</span>
        </label>
      ))}
      {brands.length > 8 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 self-start text-[12px] font-extrabold text-primary hover:underline"
        >
          {expanded ? "Show less" : `Show ${brands.length - 8} more`}
        </button>
      )}
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
              "relative flex size-8 items-center justify-center rounded-full border border-border shadow-sm transition-transform hover:scale-105",
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

function TextOption({ option }: { option: FacetOption }) {
  const { getList, toggleInList } = useFilterParams();
  const key = `opt_${option.key}`;
  const selected = getList(key);

  return (
    <div className="flex flex-wrap gap-2">
      {option.values.map((v) => {
        const isSel = selected.includes(v.value);
        return (
          <button
            key={v.value}
            type="button"
            aria-pressed={isSel}
            onClick={() => toggleInList(key, v.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors",
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
  );
}

/* ----------------------------------------------------------------------- */
/* Controls                                                                */
/* ----------------------------------------------------------------------- */

function FilterControls({ facets, subcategories }: FilterProps) {
  const { get, setParams } = useFilterParams();

  const inStock = get("instock") === "1";
  const onSale = get("sale") === "1";

  const hasBrands = !!facets && facets.brands.length > 0;
  const hasRating =
    !!facets && facets.ratingCounts.some((r) => r.count > 0);
  const hasPrice = !!facets?.priceRange;
  const options = React.useMemo(() => facets?.options ?? [], [facets]);

  // Default-open every section that has content.
  const openValues = React.useMemo(() => {
    const v = ["price", "availability"];
    if (hasRating) v.push("rating");
    if (hasBrands) v.push("brand");
    for (const o of options) v.push(`opt-${o.key}`);
    return v;
  }, [hasRating, hasBrands, options]);

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

      <Accordion type="multiple" defaultValue={openValues}>
        {hasPrice && (
          <AccordionItem value="price">
            <AccordionTrigger>Price (৳)</AccordionTrigger>
            <AccordionContent>
              <PriceFilter facets={facets} />
            </AccordionContent>
          </AccordionItem>
        )}

        {facets && (
          <AccordionItem value="availability">
            <AccordionTrigger>Availability</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3">
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-sub">
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
                <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-sub">
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
        )}

        {hasRating && facets && (
          <AccordionItem value="rating">
            <AccordionTrigger>Rating</AccordionTrigger>
            <AccordionContent>
              <RatingFilter facets={facets} />
            </AccordionContent>
          </AccordionItem>
        )}

        {hasBrands && facets && (
          <AccordionItem value="brand">
            <AccordionTrigger>Brand</AccordionTrigger>
            <AccordionContent>
              <BrandFilter facets={facets} />
            </AccordionContent>
          </AccordionItem>
        )}

        {options.map((o) => (
          <AccordionItem key={o.key} value={`opt-${o.key}`}>
            <AccordionTrigger>{o.key}</AccordionTrigger>
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
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Sidebar / Sheet                                                         */
/* ----------------------------------------------------------------------- */

/** Desktop sticky filter rail. */
export function FilterSidebar(props: FilterProps) {
  return (
    <aside className="hidden h-max rounded-2xl border border-border bg-card p-5 lg:block">
      <FilterControls {...props} />
    </aside>
  );
}

/** Mobile "Filters" button → bottom sheet. */
export function FilterSheet(props: FilterProps) {
  const { activeCount } = useFilterParams();
  const [open, setOpen] = React.useState(false);
  const total = props.facets?.total;
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
      <SheetContent side="bottom" className="max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <FilterControls {...props} />
        </div>
        <div className="border-t border-border p-4">
          <Button fullWidth variant="primary" onClick={() => setOpen(false)}>
            {typeof total === "number"
              ? `Show ${formatCompact(total)} results`
              : "Show results"}
          </Button>
        </div>
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
    chips.push({
      key: "price",
      label: `৳${get("minPrice") || "0"} – ৳${get("maxPrice") || "∞"}`,
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

  // Dynamic option values (one chip per value).
  for (const [optKey, values] of Object.entries(getOptions())) {
    for (const value of values) {
      chips.push({
        key: `opt:${optKey}:${value}`,
        label: value,
        clear: () => toggleInList(`opt_${optKey}`, value),
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.clear}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-soft px-3 py-1.5 text-xs font-extrabold text-primary"
        >
          {c.label}
          <X className="size-3" strokeWidth={3} />
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs font-extrabold text-primary hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}
