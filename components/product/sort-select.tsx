"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilterParams } from "@/lib/use-filters";

const OPTIONS: { value: string; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating_desc", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

/** Sort dropdown wired to the `sort` URL param (search endpoint). */
export function SortSelect() {
  const { get, setParams } = useFilterParams();
  const value = get("sort") || "relevance";
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[12.5px] font-bold text-faint sm:inline">Sort by</span>
      <Select value={value} onValueChange={(v) => setParams({ sort: v })}>
        <SelectTrigger className="min-w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
