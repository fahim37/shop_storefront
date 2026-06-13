"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterParams } from "@/lib/use-filters";

export interface SortOption {
  value: string;
  label: string;
}

/** Search context: relevance is the default. */
export const SEARCH_SORT_OPTIONS: SortOption[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating_desc", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

/** Category/listing context: newest is the default. */
export const LISTING_SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest" },
  { value: "best_selling", label: "Best selling" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating_desc", label: "Top rated" },
];

export interface SortSelectProps {
  /** Available options (default = search options). */
  options?: SortOption[];
  /** Selected when no `sort` param is present (default = first option). */
  defaultValue?: string;
}

/** Sort dropdown wired to the `sort` URL param. Usable on both pages. */
export function SortSelect({
  options = SEARCH_SORT_OPTIONS,
  defaultValue,
}: SortSelectProps) {
  const { get, setParams } = useFilterParams();
  const fallback = defaultValue ?? options[0]?.value ?? "relevance";
  const value = get("sort") || fallback;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[12.5px] font-bold text-faint sm:inline">Sort by</span>
      <Select
        value={value}
        onValueChange={(v) => setParams({ sort: v === fallback ? null : v })}
      >
        <SelectTrigger className="min-w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
