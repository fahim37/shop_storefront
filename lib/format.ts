/**
 * Formatting helpers. The backend serializes all money as BDT **paisa** in a
 * JSON string (1 BDT = 100 paisa, bigint on the wire). We format with BigInt to
 * avoid the precision loss of Number() past 2^53 — never `Number(paisa)`.
 */

const TAKA = "৳"; // ৳ Bengali taka sign

/** Group an integer's digits with thousands separators. */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export interface FormatPaisaOptions {
  /** Prefix the ৳ symbol (default true). */
  withSymbol?: boolean;
  /** Render `null`/invalid as this string (default "—" with symbol). */
  fallback?: string;
}

/**
 * Format a paisa string/number/bigint as taka, e.g. `"129000"` → `"৳1,290"`.
 * Sub-taka remainders render with two decimals (`"129050"` → `"৳1,290.50"`).
 */
export function formatPaisa(
  value: string | number | bigint | null | undefined,
  options: FormatPaisaOptions = {},
): string {
  const { withSymbol = true, fallback } = options;
  if (value === null || value === undefined || value === "") {
    return fallback ?? (withSymbol ? `${TAKA}—` : "—");
  }
  let paisa: bigint;
  try {
    paisa = typeof value === "bigint" ? value : BigInt(value);
  } catch {
    return fallback ?? (withSymbol ? `${TAKA}—` : "—");
  }
  const negative = paisa < 0n;
  if (negative) paisa = -paisa;
  const taka = paisa / 100n;
  const sub = paisa % 100n;
  const intPart = groupThousands(taka.toString());
  const decPart = sub === 0n ? "" : `.${sub.toString().padStart(2, "0")}`;
  return `${negative ? "-" : ""}${withSymbol ? TAKA : ""}${intPart}${decPart}`;
}

/** Sum a list of paisa strings, returning a paisa string. */
export function sumPaisa(values: Array<string | null | undefined>): string {
  let total = 0n;
  for (const v of values) {
    if (!v) continue;
    try {
      total += BigInt(v);
    } catch {
      /* ignore non-numeric */
    }
  }
  return total.toString();
}

/**
 * Percentage saved between a sale price and its (higher) compare-at price.
 * Returns a positive integer percent, or null when not a valid discount.
 */
export function discountPercent(
  pricePaisa: string | null | undefined,
  comparePaisa: string | null | undefined,
): number | null {
  if (!pricePaisa || !comparePaisa) return null;
  try {
    const price = BigInt(pricePaisa);
    const compare = BigInt(comparePaisa);
    if (compare <= price || compare <= 0n) return null;
    const pct = Number(((compare - price) * 100n) / compare);
    return pct > 0 ? pct : null;
  } catch {
    return null;
  }
}

/** Compact a count: 1234 → "1.2k", 1_500_000 → "1.5M". */
export function formatCompact(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || Number.isNaN(n)) return "0";
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) return `${trimZero(n / 1000)}k`;
  return `${trimZero(n / 1_000_000)}M`;
}

function trimZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** "4.8" rating display from a numeric|string|null average. */
export function formatRating(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || Number.isNaN(n) || n <= 0) return "—";
  return n.toFixed(1);
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "10 Jun 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FMT.format(d);
}

/** "10 Jun 2026, 4:30 PM" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${DATE_FMT.format(d)}, ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

/** Coarse relative time: "2 days ago", "just now". */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

/** Initials for an avatar fallback: "Fahim Ahmed" → "FA". */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
