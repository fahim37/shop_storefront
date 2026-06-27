"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutocomplete } from "@/lib/api/search";
import { MediaImage } from "@/components/ui/media-image";

export interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Render compact (mobile) styling. */
  compact?: boolean;
  initialQuery?: string;
}

/** Navbar search with debounced autocomplete suggestions. */
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

  const { data } = useAutocomplete(debounced);
  const suggestions = data?.items ?? [];
  const showPanel = focused && value.trim().length >= 2;

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

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
            ? "h-11 border border-border px-3"
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
        {compact && (
          <span className="flex items-center gap-1 rounded-full bg-[oklch(0.95_0.03_300/0.6)] px-2 py-1 text-[10px] font-extrabold text-[oklch(0.45_0.16_300)]">
            <Sparkles className="size-3" strokeWidth={2.2} />
            AI
          </span>
        )}
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-pop)] animate-in fade-in-0 slide-in-from-top-1">
          {suggestions.length > 0 ? (
            <ul className="max-h-[60vh] overflow-y-auto p-1.5">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFocused(false);
                      router.push(`/product/${s.slug}`);
                    }}
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
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No quick matches — press Enter to search.
            </div>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => submit(value)}
            className="flex w-full items-center gap-2 border-t border-border bg-muted px-4 py-2.5 text-left text-[13px] font-bold text-primary"
          >
            <TrendingUp className="size-4" />
            Search for &ldquo;{value.trim()}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
