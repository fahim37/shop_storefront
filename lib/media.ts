import { API_BASE_URL } from "@/lib/config";

/**
 * Image variants exposed by the backend media service. The backend resizes on
 * upload, so we pick the right size per context rather than client-resizing.
 */
export type MediaVariant = "original" | "thumbnail" | "card" | "hero";

/**
 * Resolve a media asset id to an image URL. We hit the backend DIRECTLY (a
 * cross-origin <img>, which is not CORS-restricted) rather than the /bff proxy:
 * the backend 302-redirects to a stable public R2 URL. Both the backend and R2
 * are HTTPS, so there's no mixed-content issue, and going direct avoids routing
 * image redirects through Vercel's edge cache (which caches the 302 and re-serves
 * it as a text/plain 200, breaking the image). Requires the backend to send
 * `Cross-Origin-Resource-Policy: cross-origin`. Returns null for a missing id.
 */
export function mediaUrl(
  mediaId: string | null | undefined,
  variant: MediaVariant = "card",
): string | null {
  if (!mediaId) return null;
  return `${API_BASE_URL}/media/${mediaId}/${variant}`;
}

/**
 * Resolve a relative media path the backend sometimes embeds directly
 * (e.g. `order_items.imageUrlSnapshot = "/v1/media/<id>/card"`) to an absolute
 * backend URL. `API_BASE_URL` already ends in `/v1`, so strip the leading `/v1`.
 */
export function resolveMediaPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/v1/")) return `${API_BASE_URL}${path.slice(3)}`;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
