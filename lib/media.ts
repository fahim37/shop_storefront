import { CLIENT_API_BASE } from "@/lib/config";

/**
 * Image variants exposed by the backend media service. The backend resizes on
 * upload, so we pick the right size per context rather than client-resizing.
 */
export type MediaVariant = "original" | "thumbnail" | "card" | "hero";

/**
 * Resolve a media asset id to an image URL. We route through the same-origin
 * BFF proxy (`/bff/v1/media/:id/:variant`) so images work from an HTTPS
 * (Vercel) page against an HTTP backend without mixed-content errors — the
 * backend 302-redirects to a presigned (HTTPS) object-storage URL, which the
 * browser follows transparently. Returns null for a missing id so callers can
 * render a placeholder.
 */
export function mediaUrl(
  mediaId: string | null | undefined,
  variant: MediaVariant = "card",
): string | null {
  if (!mediaId) return null;
  return `${CLIENT_API_BASE}/media/${mediaId}/${variant}`;
}

/**
 * Resolve a relative media path the backend sometimes embeds directly
 * (e.g. `order_items.imageUrlSnapshot = "/v1/media/<id>/card"`) to a
 * same-origin proxied URL (`/bff/v1/media/<id>/card`).
 */
export function resolveMediaPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/v1/")) return `/bff${path}`;
  return `${CLIENT_API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}
