/**
 * Centralized runtime configuration.
 *
 * {@link API_BASE_URL} — the ABSOLUTE backend URL. Used by both Server
 * Components (`lib/api/server`) and browser `fetch` calls, and to build media
 * URLs (cross-origin <img> loads are not CORS-restricted). Inlined at build
 * time (NEXT_PUBLIC_*). The backend is served over HTTPS and allowlists our
 * origin via CORS, so no same-origin proxy is needed.
 */

/** Absolute backend base, already ending in `/v1`. */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ??
  "http://62.72.58.29:4000/v1";

/**
 * Google Identity Services client id used for "Continue with Google".
 * When empty, the Google sign-in button is rendered disabled.
 */
export const GOOGLE_CLIENT_ID: string =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Whether social Google sign-in is configured/enabled. */
export const isGoogleAuthEnabled: boolean = GOOGLE_CLIENT_ID.length > 0;

/**
 * Google Maps Platform key (Maps JavaScript API + Places API New + Geocoding
 * API). Client-side key — restrict it by HTTP referrer + API in the Cloud
 * console. When empty, address forms fall back to manual entry (no map).
 */
export const GOOGLE_MAPS_API_KEY: string =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/** Vector Map ID required by AdvancedMarkerElement. `DEMO_MAP_ID` is fine for dev. */
export const GOOGLE_MAPS_MAP_ID: string =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/** Whether the map-backed location picker is available. */
export const isMapsEnabled: boolean = GOOGLE_MAPS_API_KEY.length > 0;

/** Default map center when no pin yet — Dhaka, Bangladesh. */
export const MAP_DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 } as const;

/** Bias/restrict Places + geocoding to Bangladesh. */
export const MAP_REGION_CODE = "bd";
