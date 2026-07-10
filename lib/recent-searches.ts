/**
 * localStorage-backed personal recent searches (device-local; the "Trending"
 * chips are global, these are the shopper's own). Exposed as a tiny external
 * store so components read it with `useSyncExternalStore` — SSR-safe (empty
 * server snapshot), hydration-safe, and every mounted search bar re-renders
 * when one of them records a term (plus cross-tab via the `storage` event).
 */

const STORAGE_KEY = "recent-searches:v1";
const MAX_RECENT = 8;

const EMPTY: string[] = [];
let cache: string[] | null = null;
const listeners = new Set<() => void>();

function readStorage(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return EMPTY;
    const items = arr
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .slice(0, MAX_RECENT);
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

function writeStorage(items: string[]): void {
  try {
    if (items.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage full/blocked — recents just won't persist */
  }
}

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeRecentSearches(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null; // another tab wrote — re-read lazily
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Client snapshot — stable reference until the list actually changes. */
export function getRecentSearches(): string[] {
  if (cache === null) cache = readStorage();
  return cache;
}

/** Server snapshot for useSyncExternalStore. */
export function getRecentSearchesServer(): string[] {
  return EMPTY;
}

/** Prepend `q` (case-insensitive dedupe, capped) and notify subscribers. */
export function addRecentSearch(q: string): void {
  const term = q.trim();
  if (!term || typeof window === "undefined") return;
  cache = [
    term,
    ...getRecentSearches().filter((t) => t.toLowerCase() !== term.toLowerCase()),
  ].slice(0, MAX_RECENT);
  writeStorage(cache);
  emit();
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  cache = EMPTY;
  writeStorage(cache);
  emit();
}
