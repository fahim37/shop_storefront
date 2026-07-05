/**
 * Variant option helpers.
 *
 * A variant's `optionValues` is a free-form `Record<string,string>` chosen by
 * the vendor (e.g. `{ Color: "Maroon", Size: "M" }`). Colour options also carry
 * the exact swatch hex under a reserved metadata key `_<OptionName>Hex`
 * (e.g. `_ColorHex: "#800000"`). These `_`-prefixed keys are NOT shopper-facing
 * option dimensions — they must be hidden from pickers and cart/line displays.
 */

const META_PREFIX = "_";
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Shopper-facing option entries (drops `_`-prefixed metadata keys). */
export function visibleOptionEntries(
  map: Record<string, string> | null | undefined,
): [string, string][] {
  return Object.entries(map ?? {}).filter(([k]) => !k.startsWith(META_PREFIX));
}

/** Just the visible option keys, in first-seen order. */
export function visibleOptionKeys(
  map: Record<string, string> | null | undefined,
): string[] {
  return visibleOptionEntries(map).map(([k]) => k);
}

/** The exact swatch hex carried for option `key` (`_<key>Hex`), if valid. */
export function carriedColorHex(
  map: Record<string, string> | null | undefined,
  key: string,
): string | undefined {
  const h = map?.[`${META_PREFIX}${key}Hex`];
  return h && HEX_RE.test(h) ? h : undefined;
}

/**
 * Best-effort hex for a human colour name — the fallback when a value carries no
 * exact `_<key>Hex` (e.g. the seeded catalogue, which only stores names like
 * "Matte White" or "Graphite Grey"). Both the PDP swatches and the filter rail
 * use this so an un-hexed colour still paints instead of a dead grey blob.
 */
const COLOR_NAME_HEX: Record<string, string> = {
  black: "#111111",
  white: "#FFFFFF",
  ivory: "#FFFFF0",
  cream: "#F5F0E1",
  offwhite: "#F3F1EA",
  red: "#E11D48",
  crimson: "#DC143C",
  maroon: "#800000",
  burgundy: "#6B1F2A",
  wine: "#722F37",
  orange: "#F97316",
  rust: "#B7410E",
  amber: "#F59E0B",
  yellow: "#F5B82E",
  mustard: "#D4A017",
  gold: "#D4AF37",
  green: "#16A34A",
  olive: "#6B7A3B",
  sage: "#9CAF88",
  mint: "#A8E6CF",
  teal: "#0D9488",
  blue: "#2563EB",
  navy: "#1E2A6E",
  royal: "#1D4ED8",
  sky: "#38BDF8",
  cyan: "#06B6D4",
  purple: "#7C3AED",
  violet: "#8B5CF6",
  lavender: "#C4B5FD",
  pink: "#EC4899",
  rose: "#F43F5E",
  brown: "#8B5E3C",
  chocolate: "#5C3A21",
  tan: "#D2B48C",
  beige: "#E3D9C6",
  khaki: "#C3B091",
  camel: "#C19A6B",
  grey: "#6B7280",
  gray: "#6B7280",
  graphite: "#3A3B3C",
  charcoal: "#36454F",
  slate: "#64748B",
  silver: "#C0C5CE",
  gunmetal: "#2A3439",
  bronze: "#CD7F32",
  copper: "#B87333",
  coral: "#FF7F50",
  turquoise: "#40E0D0",
  matte: "#4B5563",
};

/**
 * Resolve a colour name to a hex, tolerant of compound/descriptive names.
 * Tries the whole string, then a space-collapsed form ("off white"), then the
 * first recognised token so "Graphite Grey" → graphite and "Matte White" →
 * white. Returns undefined when nothing is recognised.
 */
export function colorNameHex(name: string): string | undefined {
  const clean = name.trim().toLowerCase();
  if (!clean) return undefined;
  if (COLOR_NAME_HEX[clean]) return COLOR_NAME_HEX[clean];
  const collapsed = clean.replace(/[\s/_-]+/g, "");
  if (COLOR_NAME_HEX[collapsed]) return COLOR_NAME_HEX[collapsed];
  for (const token of clean.split(/[\s/_-]+/)) {
    if (COLOR_NAME_HEX[token]) return COLOR_NAME_HEX[token];
  }
  return undefined;
}
