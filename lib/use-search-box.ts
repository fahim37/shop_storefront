"use client";

/**
 * All state + behavior for the header search combobox, shared by the desktop
 * and mobile SearchBar instances so the logic isn't duplicated:
 *
 *  - debounced autocomplete with a real `pending` signal (the immediate value
 *    and the debounced query differ, or the fetch is in flight) so the panel
 *    can show a spinner instead of flashing "no matches"
 *  - URL sync: on /search the input seeds from and follows `?q=`
 *  - a flat, ordered list of navigable options driving ArrowUp/Down + Enter
 *    keyboard navigation and `aria-activedescendant`
 *  - pointerdown-outside + Escape closing (no blur-timeout races)
 *  - personal recent searches (external localStorage store) recorded on submit
 *
 * State that must follow props/route (URL `q`, close-on-navigation, highlight
 * reset when options change) is adjusted during render via the prev-value
 * compare pattern — not in effects — matching the FilterBar convention.
 */

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAutocomplete, useTrending } from "@/lib/api/search";
import { useCategoryTree } from "@/lib/api/catalog";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  getRecentSearchesServer,
  subscribeRecentSearches,
} from "@/lib/recent-searches";

export interface SearchNavItem {
  /** Stable key — also the DOM id suffix for aria-activedescendant. */
  key: string;
  run: () => void;
}

const DEBOUNCE_MS = 200;

export function useSearchBox(instanceId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── input value, seeded from /search?q= and following URL navigations ────
  const urlQuery = pathname === "/search" ? (searchParams.get("q") ?? "") : null;
  const [value, setValue] = React.useState(urlQuery ?? "");
  const [prevUrlQuery, setPrevUrlQuery] = React.useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    if (urlQuery !== null) setValue(urlQuery);
  }

  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  const trimmed = value.trim();
  const hasQuery = trimmed.length >= 2;

  // ── open/close ────────────────────────────────────────────────────────────
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Close when navigation lands somewhere new (suggestion click, submit, back).
  const navLocation = `${pathname}?${searchParams.toString()}`;
  const [prevNavLocation, setPrevNavLocation] = React.useState(navLocation);
  if (navLocation !== prevNavLocation) {
    setPrevNavLocation(navLocation);
    if (open) setOpen(false);
  }

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // ── data ──────────────────────────────────────────────────────────────────
  const autocompleteQuery = useAutocomplete(debounced);
  const suggestions = React.useMemo(
    () => autocompleteQuery.data?.items ?? [],
    [autocompleteQuery.data],
  );
  const didYouMean = autocompleteQuery.data?.suggestion ?? null;
  /** True while typed input hasn't settled into results yet. */
  const pending =
    hasQuery && (trimmed !== debounced.trim() || autocompleteQuery.isFetching);

  const discoverOpen = open && !hasQuery;
  const { data: trending } = useTrending(discoverOpen);
  const { data: categories } = useCategoryTree({ enabled: discoverOpen });
  const trendingTerms = React.useMemo(() => trending?.items ?? [], [trending]);
  const topCategories = React.useMemo(
    () => (categories ?? []).slice(0, 6),
    [categories],
  );

  const recents = React.useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearches,
    getRecentSearchesServer,
  );

  // ── actions ───────────────────────────────────────────────────────────────
  const submit = React.useCallback(
    (q: string) => {
      const next = q.trim();
      if (!next) return;
      addRecentSearch(next);
      setValue(next);
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(next)}`);
    },
    [router],
  );

  const goProduct = React.useCallback(
    (slug: string) => {
      setOpen(false);
      router.push(`/product/${slug}`);
    },
    [router],
  );

  const goCategory = React.useCallback(
    (slug: string) => {
      setOpen(false);
      router.push(`/category/${slug}`);
    },
    [router],
  );

  const clearRecents = React.useCallback(() => {
    clearRecentSearches();
  }, []);

  // ── keyboard navigation over a flat ordered option list ──────────────────
  const navItems: SearchNavItem[] = React.useMemo(() => {
    if (hasQuery) {
      const items: SearchNavItem[] = suggestions.map((s) => ({
        key: `product-${s.id}`,
        run: () => goProduct(s.slug),
      }));
      if (suggestions.length === 0 && didYouMean) {
        items.push({ key: "did-you-mean", run: () => submit(didYouMean) });
      }
      items.push({ key: "search-for", run: () => submit(value) });
      return items;
    }
    return [
      ...recents.map((term) => ({ key: `recent-${term}`, run: () => submit(term) })),
      ...trendingTerms.map((term) => ({
        key: `trending-${term}`,
        run: () => submit(term),
      })),
      ...topCategories.map((c) => ({
        key: `category-${c.id}`,
        run: () => goCategory(c.slug),
      })),
    ];
  }, [
    hasQuery,
    suggestions,
    didYouMean,
    value,
    recents,
    trendingTerms,
    topCategories,
    submit,
    goProduct,
    goCategory,
  ]);

  // Reset the highlight whenever the visible option set changes.
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const navSignature = navItems.map((i) => i.key).join("|");
  const [prevNavSignature, setPrevNavSignature] = React.useState(navSignature);
  if (navSignature !== prevNavSignature) {
    setPrevNavSignature(navSignature);
    if (activeIndex !== -1) setActiveIndex(-1);
  }

  const optionId = React.useCallback(
    (key: string) => `search-${instanceId}-option-${key}`,
    [instanceId],
  );
  const listboxId = `search-${instanceId}-listbox`;
  const activeKey = activeIndex >= 0 ? (navItems[activeIndex]?.key ?? null) : null;

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (navItems.length === 0) return;
      setActiveIndex((prev) => {
        if (e.key === "ArrowDown") return prev >= navItems.length - 1 ? 0 : prev + 1;
        return prev <= 0 ? navItems.length - 1 : prev - 1;
      });
      return;
    }
    if (e.key === "Enter" && activeIndex >= 0 && navItems[activeIndex]) {
      e.preventDefault();
      navItems[activeIndex].run();
    }
  };

  // Keep the highlighted option scrolled into view (DOM sync — effect is fine).
  React.useEffect(() => {
    if (!activeKey) return;
    document
      .getElementById(optionId(activeKey))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeKey, optionId]);

  return {
    // input
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
    // data
    suggestions,
    didYouMean,
    trendingTerms,
    topCategories,
    recents,
    // actions
    submit,
    goProduct,
    goCategory,
    clearRecents,
    // combobox wiring
    navItems,
    activeKey,
    optionId,
    listboxId,
  };
}
