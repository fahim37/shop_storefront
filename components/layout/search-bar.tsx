"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Grid3x3, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutocomplete, useTrending } from "@/lib/api/search";
import { useCategoryTree } from "@/lib/api/catalog";
import { MediaImage } from "@/components/ui/media-image";

export interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Render compact (mobile) styling. */
  compact?: boolean;
  initialQuery?: string;
}

/** Navbar search with debounced typo-tolerant autocomplete + discovery panel. */
export function SearchBar({
  className,
  placeholder = "Search 36,000+ products…",
  autoFocus,
  compact,
  initialQuery = "",
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = React.useState(initialQuery);
  const [focused, setFocused] = React.useState(false);
  const [debounced, setDebounced] = React.useState(initialQuery);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 200);
    return () => clearTimeout(t);
  }, [value]);

  const trimmed = value.trim();
  const hasQuery = trimmed.length >= 2;

  const { data: ac } = useAutocomplete(debounced);
  const suggestions = ac?.items ?? [];
  const suggestion = ac?.suggestion ?? null;

  // Discovery (empty-state) data — only fetched while the empty panel is open.
  const discoverOpen = focused && !hasQuery;
  const { data: trending } = useTrending(discoverOpen);
  const { data: categories } = useCategoryTree({ enabled: discoverOpen });
  const trendingTerms = trending?.items ?? [];
  const topCategories = (categories ?? []).slice(0, 6);

  const showPanel = focused;

  const submit = (q: string) => {
    const next = q.trim();
    if (!next) return;
    setFocused(false);
    setValue(next);
    router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  const goProduct = (slug: string) => {
    setFocused(false);
    router.push(`/product/${slug}`);
  };

  const goCategory = (slug: string) => {
    setFocused(false);
    router.push(`/category/${slug}`);
  };

  // Keeps focus on the input (so onBlur doesn't close the panel mid-click).
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className={cn(
          "flex items-center overflow-hidden rounded-xl bg-white",
          compact
            ? "h-9 border border-border px-3"
            : "h-12 border-2 border-blue-deep",
        )}
      >
        {compact && <Search className="size-4 shrink-0 text-faint" />}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Search products"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-faint"
        />
        {!compact && (
          <button
            type="submit"
            className="flex h-full items-center gap-2 bg-blue-deep px-5 text-sm font-extrabold text-white"
          >
            <Search className="size-4" strokeWidth={2.2} />
            <span className="hidden lg:inline">Search</span>
          </button>
        )}
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-pop)] animate-in fade-in-0 slide-in-from-top-1">
          {hasQuery ? (
            <>
              {suggestions.length > 0 ? (
                <ul className="max-h-[60vh] overflow-y-auto p-1.5">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onMouseDown={keepFocus}
                        onClick={() => goProduct(s.slug)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="size-9 shrink-0 overflow-hidden rounded-md">
                          <MediaImage mediaId={s.thumbnailMediaId} variant="thumbnail" alt="" />
                        </span>
                        <span className="line-clamp-1 font-semibold">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : suggestion ? (
                <button
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={() => submit(suggestion)}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-sm hover:bg-muted"
                >
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" strokeWidth={2.2} />
                  <span className="text-muted-foreground">
                    Did you mean{" "}
                    <span className="font-bold text-ink">{suggestion}</span>?
                  </span>
                </button>
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No quick matches — press Enter to search.
                </div>
              )}
              <button
                type="button"
                onMouseDown={keepFocus}
                onClick={() => submit(value)}
                className="flex w-full items-center gap-2 border-t border-border bg-muted px-4 py-2.5 text-left text-[13px] font-bold text-primary"
              >
                <TrendingUp className="size-4" />
                Search for &ldquo;{trimmed}&rdquo;
              </button>
            </>
          ) : (
            <div className="p-3">
              {trendingTerms.length > 0 && (
                <div className="mb-1">
                  <p className="flex items-center gap-1.5 px-1 pb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-faint">
                    <TrendingUp className="size-3.5" strokeWidth={2.4} />
                    Trending
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {trendingTerms.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onMouseDown={keepFocus}
                        onClick={() => submit(term)}
                        className="rounded-full border border-border bg-muted px-3 py-1.5 text-[13px] font-semibold text-ink hover:border-blue-deep hover:text-primary"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {topCategories.length > 0 && (
                <div className={cn(trendingTerms.length > 0 && "mt-3")}>
                  <p className="flex items-center gap-1.5 px-1 pb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-faint">
                    <Grid3x3 className="size-3.5" strokeWidth={2.4} />
                    Browse categories
                  </p>
                  <ul>
                    {topCategories.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={keepFocus}
                          onClick={() => goCategory(c.slug)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-ink hover:bg-muted"
                        >
                          <Grid3x3 className="size-4 shrink-0 text-faint" strokeWidth={2} />
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {trendingTerms.length === 0 && topCategories.length === 0 && (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  Start typing to search products…
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
