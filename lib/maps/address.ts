/**
 * Turn Google address components into the Bangladesh address fields our forms
 * use. Works for both the New Places API (`AddressComponent.longText`) and the
 * classic Geocoder (`GeocoderAddressComponent.long_name`) by normalizing first.
 *
 * Mapping is best-effort — Google's administrative levels don't map 1:1 onto
 * BD's Division / District / Upazila / Union, so every field stays editable in
 * the form. We fill what we can confidently resolve.
 */

export interface ParsedAddress {
  division: string;
  district: string;
  upazila: string;
  unionName: string;
  postcode: string;
  streetAddress: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

interface NormComponent {
  long: string;
  types: string[];
}

function pick(comps: NormComponent[], ...wantedTypes: string[]): string {
  for (const type of wantedTypes) {
    const hit = comps.find((c) => c.types.includes(type));
    if (hit?.long) return hit.long;
  }
  return "";
}

export function normalizeNewComponents(
  components: google.maps.places.AddressComponent[] | null | undefined,
): NormComponent[] {
  return (components ?? []).map((c) => ({
    long: c.longText ?? c.shortText ?? "",
    types: c.types ?? [],
  }));
}

export function normalizeClassicComponents(
  components: google.maps.GeocoderAddressComponent[] | null | undefined,
): NormComponent[] {
  return (components ?? []).map((c) => ({
    long: c.long_name ?? "",
    types: c.types ?? [],
  }));
}

export function buildAddress(
  comps: NormComponent[],
  opts: { formatted: string; lat: number; lng: number; displayName?: string },
): ParsedAddress {
  const division = pick(comps, "administrative_area_level_1").replace(
    /\s+division$/i,
    "",
  );
  const district = pick(comps, "administrative_area_level_2").replace(
    /\s+district$/i,
    "",
  );
  const upazila = pick(
    comps,
    "administrative_area_level_3",
    "locality",
    "postal_town",
  );
  const unionName = pick(
    comps,
    "sublocality_level_1",
    "sublocality",
    "neighborhood",
    "administrative_area_level_4",
  );
  const postcode = pick(comps, "postal_code");

  const streetNumber = pick(comps, "street_number");
  const route = pick(comps, "route");
  const premise = pick(comps, "premise");
  const streetLine =
    [premise, [streetNumber, route].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ") ||
    opts.displayName ||
    opts.formatted;

  return {
    division,
    district,
    upazila,
    unionName,
    postcode,
    streetAddress: streetLine,
    formattedAddress: opts.formatted,
    latitude: opts.lat,
    longitude: opts.lng,
  };
}
