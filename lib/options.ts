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
