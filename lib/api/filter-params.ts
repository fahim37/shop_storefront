/**
 * Shared mapping helpers that translate the storefront's filter param shapes
 * (see `ProductListParams` / `SearchParams`) into the EXACT wire param names
 * the backend contract expects.
 *
 * Contract (verbatim names):
 *   brandIds                       CSV of brand uuids (NEW multi-brand)
 *   priceMinPaisa / priceMaxPaisa  integer strings
 *   rating                         number 0..5
 *   inStock                        "true"
 *   onSale                         "true"
 *   opt[<Key>]                     CSV of option values (skip "_"-prefixed keys)
 *   sort / limit / cursor          pagination + ordering
 */

type ParamPrimitive = string | number | boolean | null | undefined;

/** Merge a single legacy brandId with the multi-brand list into one CSV. */
export function unionBrandIds(
  brandId: string | undefined,
  brandIds: string[] | undefined,
): string | undefined {
  const all: string[] = [];
  if (brandIds) all.push(...brandIds);
  if (brandId && !all.includes(brandId)) all.push(brandId);
  return all.length ? all.join(",") : undefined;
}

/**
 * Emit `opt[<Key>]=csv` entries for each option key, skipping reserved
 * "_"-prefixed keys and empty value lists.
 */
export function optionParams(
  options: Record<string, string[]> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!options) return out;
  for (const [key, values] of Object.entries(options)) {
    if (key.startsWith("_")) continue; // reserved hex metadata
    const csv = values.filter(Boolean).join(",");
    if (csv) out[`opt[${key}]`] = csv;
  }
  return out;
}

/** Drop undefined/null/empty entries so they never hit the query string. */
export function compactParams(
  params: Record<string, ParamPrimitive>,
): Record<string, ParamPrimitive> {
  const out: Record<string, ParamPrimitive> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    out[k] = v;
  }
  return out;
}
