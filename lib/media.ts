import { API_BASE_URL } from "@/lib/config";

/**
 * Image variants exposed by the backend media service. The backend resizes on
 * upload, so we pick the right size per context rather than client-resizing.
 */
export type MediaVariant = "original" | "thumbnail" | "card" | "hero";

/** Origin without the trailing `/v1` (e.g. `http://localhost:4000`). */
const API_ORIGIN = API_BASE_URL.replace(/\/v1\/?$/, "");

/**
 * Resolve a media asset id to a stable image URL. The backend endpoint
 * `GET /v1/media/:id/:variant` 302-redirects to a freshly presigned URL; the
 * browser follows it transparently when used as an `<img src>`. Returns null
 * for a missing id so callers can render a placeholder.
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
 * (e.g. `order_items.imageUrlSnapshot = "/v1/media/<id>/card"`) into an
 * absolute URL by prefixing the API origin.
 */
export function resolveMediaPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}
