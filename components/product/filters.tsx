"use client";

import * as React from "react";
import Link from "next/link";
import { SlidersHorizontal, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useFilterParams } from "@/lib/use-filters";
import type { Brand, CategoryNode } from "@/lib/api/types";

export interface FilterProps {
  brands?: Brand[];
  subcategories?: CategoryNode[];
  /** Rating filter only works on the search endpoint. */
  showRating?: boolean;
}

function PriceFilter() {
  const { get, setParams } = useFilterParams();
  const [min, setMin] = React.useState(get("minPrice"));
  const [max, setMax] = React.useState(get("maxPrice"));

  React.useEffect(() => setMin(get("minPrice")), [get]);
  React.useEffect(() => setMax(get("maxPrice")), [get]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          placeholder="Min ৳"
          value={min}
          onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
          className="h-9 text-[13px]"
        />
        <span className="text-faint">—</span>
        <Input
          inputMode="numeric"
          placeholder="Max ৳"
          value={max}
          onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
          className="h-9 text-[13px]"
        />
      </div>
      <Button
        size="sm"
        variant="soft"
        fullWidth
        onClick={() => setParams({ minPrice: min || null, maxPrice: max || null })}
      >
        Apply price
      </Button>
    </div>
  );
}

function FilterControls({ brands, subcategories, showRating }: FilterProps) {
  const { get, setParams } = useFilterParams();
  const activeBrand = get("brand");
  const activeRating = get("rating");

  return (
    <div className="flex flex-col gap-5">
      {subcategories && subcategories.length > 0 && (
        <section>
          <h4 className="mb-3 font-display text-[13px] font-extrabold">Subcategories</h4>
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

      <section>
        <h4 className="mb-3 font-display text-[13px] font-extrabold">Price (৳)</h4>
        <PriceFilter />
      </section>

      {brands && brands.length > 0 && (
        <section>
          <h4 className="mb-3 font-display text-[13px] font-extrabold">Brand</h4>
          <div className="flex flex-col gap-2.5">
            {brands.slice(0, 12).map((b) => (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-sub"
              >
                <Checkbox
                  className="size-[18px]"
                  checked={activeBrand === b.id}
                  onCheckedChange={(checked) =>
                    setParams({ brand: checked ? b.id : null })
                  }
                />
                {b.name}
              </label>
            ))}
          </div>
        </section>
      )}

      {showRating && (
        <section>
          <h4 className="mb-3 font-display text-[13px] font-extrabold">Rating</h4>
          <div className="flex flex-col gap-2">
            {[4, 3].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setParams({ rating: activeRating === String(r) ? null : r })}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold",
                  activeRating === String(r) ? "bg-blue-soft text-primary" : "text-sub",
                )}
              >
                <span className="flex items-center gap-0.5 text-amber-deep">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-3.5",
                        i <= r ? "fill-amber-deep" : "text-[oklch(0.88_0.01_258)]",
                      )}
                      strokeWidth={1.6}
                    />
                  ))}
                </span>
                &amp; up
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

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
        <div className="flex-1 overflow-y-auto p-5">
          <FilterControls {...props} />
        </div>
        <div className="border-t border-border p-4">
          <Button fullWidth variant="primary" onClick={() => setOpen(false)}>
            Show results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Removable active-filter chips + clear all. */
export function ActiveFilterChips({ brands }: { brands?: Brand[] }) {
  const { get, setParams, clearAll, activeCount } = useFilterParams();
  if (activeCount === 0) return null;
  const brandName = brands?.find((b) => b.id === get("brand"))?.name;
  const chips: { label: string; clear: () => void }[] = [];
  if (get("brand"))
    chips.push({ label: brandName ?? "Brand", clear: () => setParams({ brand: null }) });
  if (get("minPrice") || get("maxPrice"))
    chips.push({
      label: `৳${get("minPrice") || "0"} – ৳${get("maxPrice") || "∞"}`,
      clear: () => setParams({ minPrice: null, maxPrice: null }),
    });
  if (get("rating"))
    chips.push({ label: `${get("rating")}★ & up`, clear: () => setParams({ rating: null }) });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
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
