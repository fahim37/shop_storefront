"use client";

import * as React from "react";
import {
  Search,
  TrendingUp,
  Grid3x3,
  Lightbulb,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPaisa } from "@/lib/format";
import { useSearchBox } from "@/lib/use-search-box";
import { MediaImage } from "@/components/ui/media-image";
import { Spinner } from "@/components/ui/spinner";

/** Bold the typed text inside a suggestion title (first case-insensitive
 *  occurrence). Typo matches have no literal substring — rendered plain. */
function HighlightMatch({ title, query }: { title: string; query: string }) {
  const q = query.trim();
  const at = q ? title.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return <>{title}</>;
  return (
    <>
      {title.slice(0, at)}
      <span className="font-extrabold text-primary">{title.slice(at, at + q.length)}</span>
      {title.slice(at + q.length)}
    </>
  );
}

export interface SearchBarProps {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Render compact (mobile) styling. */
  compact?: boolean;
}

/**
 * Navbar search combobox: debounced typo-tolerant autocomplete, recent
 * searches, trending/category discovery, and full keyboard navigation
 * (↑↓ + Enter + Escape, aria-activedescendant).
 *
 * `useSearchBox` calls `useSearchParams` (the input follows /search?q=), which
 * on prerendered routes must sit under a Suspense boundary — the exported
 * component provides one so every call site stays safe.
 */
export function SearchBar(props: SearchBarProps) {
  return (
    <React.Suspense fallback={<SearchBarShell {...props} />}>
      <SearchBarInner {...props} />
    </React.Suspense>
  );
}

const DEFAULT_PLACEHOLDER = "Search 36,000+ products…";

function formClasses(compact?: boolean) {
  return cn(
    "flex items-center overflow-hidden rounded-xl bg-white transition-shadow",
    compact
      ? "h-9 border border-border px-3 focus-within:border-blue-deep focus-within:ring-2 focus-within:ring-blue-soft"
      : "h-12 border-2 border-blue-deep focus-within:ring-2 focus-within:ring-blue-soft",
  );
}

/** Static markup-only fallback rendered while the interactive bar suspends. */
function SearchBarShell({
  className,
  placeholder = DEFAULT_PLACEHOLDER,
  compact,
}: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <div className={formClasses(compact)}>
        {compact && <Search className="size-4 shrink-0 text-faint" />}
        <input
          readOnly
          placeholder={placeholder}
          aria-label="Search products"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-faint"
        />
        {!compact && (
          <span className="flex h-full items-center gap-2 bg-blue-deep px-5 text-sm font-extrabold text-white">
            <Search className="size-4" strokeWidth={2.2} />
            <span className="hidden lg:inline">Search</span>
          </span>
        )}
      </div>
    </div>
  );
}

function SearchBarInner({
  className,
  placeholder = DEFAULT_PLACEHOLDER,
  autoFocus,
  compact,
}: SearchBarProps) {
  const instanceId = React.useId();
  const box = useSearchBox(instanceId);
  const {
    value,
    setValue,
    trimmed,
    hasQuery,
    pending,
    open,
    setOpen,
    containerRef,
    inputRef,
    onInputKeyDown,
    suggestions,
    didYouMean,
    trendingTerms,
    topCategories,
    recents,
    submit,
    goProduct,
    goCategory,
    clearRecents,
    activeKey,
    optionId,
    listboxId,
  } = box;

  /** Shared option shell — highlight follows keyboard focus via activeKey. */
  const option = (key: string, extra?: string) =>
    cn(extra, activeKey === key && "bg-muted");
  const optionProps = (key: string) => ({
    id: optionId(key),
    role: "option" as const,
    "aria-selected": activeKey === key,
    tabIndex: -1,
  });

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className={formClasses(compact)}
      >
        {compact && <Search className="size-4 shrink-0 text-faint" />}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Reopen on click too — after Escape the input keeps focus, so a
          // second click fires no focus event.
          onClick={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Search products"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && activeKey ? optionId(activeKey) : undefined}
          autoComplete="off"
          spellCheck={false}
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

      {open && (
        <div
          className={cn(
            "absolute top-[calc(100%+8px)] z-50 overflow-hidden border border-border bg-popover shadow-(--shadow-pop) animate-in fade-in-0 slide-in-from-top-1",
            // Compact bar lives inside the padded .wrap — bleed the panel to
            // the screen edges so it isn't a skinny clipped column on mobile.
            compact ? "-left-4 -right-4 rounded-lg" : "left-0 right-0 rounded-xl",
          )}
        >
          <div
            id={listboxId}
            role="listbox"
            aria-label="Search suggestions"
            className="max-h-[min(70vh,480px)] overflow-y-auto"
          >
            {hasQuery ? (
              <>
                {pending ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    Searching…
                  </div>
                ) : suggestions.length > 0 ? (
                  <ul className="p-1.5">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          {...optionProps(`product-${s.id}`)}
                          onClick={() => goProduct(s.slug)}
                          className={option(
                            `product-${s.id}`,
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted",
                          )}
                        >
                          <span className="size-10 shrink-0 overflow-hidden rounded-md border border-border/60">
                            <MediaImage mediaId={s.thumbnailMediaId} variant="thumbnail" alt="" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 font-semibold">
                              <HighlightMatch title={s.title} query={trimmed} />
                            </span>
                            {s.brandName && (
                              <span className="line-clamp-1 text-xs text-sub">{s.brandName}</span>
                            )}
                          </span>
                          {s.minPricePaisa && (
                            <span className="shrink-0 text-13 font-extrabold text-ink">
                              {formatPaisa(s.minPricePaisa)}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : didYouMean ? (
                  <button
                    type="button"
                    {...optionProps("did-you-mean")}
                    onClick={() => submit(didYouMean)}
                    className={option(
                      "did-you-mean",
                      "flex w-full items-start gap-2.5 px-4 py-3 text-left text-sm hover:bg-muted",
                    )}
                  >
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" strokeWidth={2.2} />
                    <span className="text-muted-foreground">
                      Did you mean <span className="font-bold text-ink">{didYouMean}</span>?
                    </span>
                  </button>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No quick matches — press Enter to search.
                  </div>
                )}
                <button
                  type="button"
                  {...optionProps("search-for")}
                  onClick={() => submit(value)}
                  className={option(
                    "search-for",
                    "flex w-full items-center gap-2 border-t border-border bg-muted px-4 py-2.5 text-left text-13 font-bold text-primary",
                  )}
                >
                  <TrendingUp className="size-4" />
                  Search for &ldquo;{trimmed}&rdquo;
                </button>
              </>
            ) : (
              <div className="p-3">
                {recents.length > 0 && (
                  <div className="mb-1">
                    <p className="flex items-center gap-1.5 px-1 pb-1.5 text-11 font-extrabold uppercase tracking-wide text-faint">
                      <Clock className="size-3.5" strokeWidth={2.4} />
                      Recent
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={clearRecents}
                        className="ml-auto font-bold normal-case tracking-normal text-primary hover:underline"
                      >
                        Clear
                      </button>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {recents.map((term) => (
                        <button
                          key={term}
                          type="button"
                          {...optionProps(`recent-${term}`)}
                          onClick={() => submit(term)}
                          className={option(
                            `recent-${term}`,
                            "rounded-full border border-border bg-white px-3 py-1.5 text-13 font-semibold text-ink hover:border-blue-deep hover:text-primary",
                          )}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {trendingTerms.length > 0 && (
                  <div className={cn(recents.length > 0 && "mt-3")}>
                    <p className="flex items-center gap-1.5 px-1 pb-1.5 text-11 font-extrabold uppercase tracking-wide text-faint">
                      <TrendingUp className="size-3.5" strokeWidth={2.4} />
                      Trending
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {trendingTerms.map((term) => (
                        <button
                          key={term}
                          type="button"
                          {...optionProps(`trending-${term}`)}
                          onClick={() => submit(term)}
                          className={option(
                            `trending-${term}`,
                            "rounded-full border border-border bg-muted px-3 py-1.5 text-13 font-semibold text-ink hover:border-blue-deep hover:text-primary",
                          )}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {topCategories.length > 0 && (
                  <div
                    className={cn(
                      (recents.length > 0 || trendingTerms.length > 0) && "mt-3",
                    )}
                  >
                    <p className="flex items-center gap-1.5 px-1 pb-1.5 text-11 font-extrabold uppercase tracking-wide text-faint">
                      <Grid3x3 className="size-3.5" strokeWidth={2.4} />
                      Browse categories
                    </p>
                    <ul>
                      {topCategories.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            {...optionProps(`category-${c.id}`)}
                            onClick={() => goCategory(c.slug)}
                            className={option(
                              `category-${c.id}`,
                              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-ink hover:bg-muted",
                            )}
                          >
                            <Grid3x3 className="size-4 shrink-0 text-faint" strokeWidth={2} />
                            {c.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recents.length === 0 &&
                  trendingTerms.length === 0 &&
                  topCategories.length === 0 && (
                    <div className="px-2 py-2 text-sm text-muted-foreground">
                      Start typing to search products…
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Keyboard hints — desktop only; touch users never see them. */}
          <div className="hidden items-center gap-3 border-t border-border bg-muted/60 px-4 py-1.5 text-11 font-semibold text-faint lg:flex">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-white px-1 font-sans">↑</kbd>
              <kbd className="rounded border border-border bg-white px-1 font-sans">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-white px-1 font-sans">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-white px-1 font-sans">esc</kbd>
              close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
