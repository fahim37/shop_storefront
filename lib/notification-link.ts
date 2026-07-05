import type { Notification } from "@/lib/api/types";

const ORDER_KEY_PREFIXES = [
  "order.",
  "sub_order.",
  "shipment.",
  "payment.",
  "return.",
];

function isOrderKey(key: string): boolean {
  return ORDER_KEY_PREFIXES.some((p) => key.startsWith(p));
}

/**
 * Best-effort in-app destination for a notification.
 *
 * Order/shipment alerts deep-link to that order's tracking page. Payloads only
 * carry the human-facing `orderNumber` (never the UUID our `/account/orders/[id]`
 * route needs), so `resolveOrderId` maps the number to an id — typically from the
 * caller's orders cache. When the order can't be resolved we fall back to the
 * orders list. Every branch returns a real, always-valid route, so a
 * notification is never a dead click.
 */
export function notificationHref(
  n: Pick<Notification, "templateKey" | "payload">,
  resolveOrderId?: (orderNumber: string) => string | undefined,
): string {
  const key = n.templateKey;

  if (isOrderKey(key)) {
    const vars = (n.payload?.vars ?? {}) as Record<string, unknown>;
    // Prefer an explicit id if the backend ever starts sending one; otherwise
    // resolve the orderNumber the payload does carry.
    const orderId =
      (typeof vars.orderId === "string" && vars.orderId) ||
      (typeof vars.orderNumber === "string"
        ? resolveOrderId?.(vars.orderNumber)
        : undefined);
    return orderId ? `/account/orders/${orderId}` : "/account/orders";
  }
  // Seller replied to the buyer's review → deep-link to that review on the
  // product page (scrolls to it + opens the conversation). Falls back to the
  // My reviews page when the payload predates the slug/id vars.
  if (key === "review.response") {
    const vars = (n.payload?.vars ?? {}) as Record<string, unknown>;
    const slug = typeof vars.productSlug === "string" ? vars.productSlug : "";
    const reviewId = typeof vars.reviewId === "string" ? vars.reviewId : "";
    if (slug && reviewId) {
      return `/products/${slug}?review=${reviewId}#reviews`;
    }
    return "/account/reviews";
  }
  if (key.startsWith("review.")) return "/account/reviews";
  if (key === "system.welcome") return "/";

  // wallet / support / auth / vendor-side keys have no dedicated storefront
  // surface — fall back to the account hub.
  return "/account";
}
