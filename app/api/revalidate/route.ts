import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";

/**
 * Webhook target for the backend's revalidate worker
 * (store_backend/src/workers/revalidate.worker.ts). The backend enqueues one
 * job per Next.js cache tag when catalog data changes (review published,
 * product/variant/image edited, stock crossing an in/low/out boundary,
 * category / homepage / CMS edits) and POSTs `{ tags: [...] }` here.
 *
 * Tags map 1:1 to the `next: { tags }` values in lib/api/server.ts —
 * `product:<slug>`, `products`, `categories`, `homepage`, `page:<slug>`.
 *
 * Each tag is expired immediately (`{ expire: 0 }`, the documented webhook
 * pattern) so the *next* visit renders fresh instead of serving one more
 * stale copy — that's the whole point of the event: a reviewer refreshing
 * the PDP should see their stars. Between events, pages fall back to the
 * long ISR window.
 *
 * Auth: shared secret in the `x-revalidate-secret` header, compared
 * timing-safe. 503 when the storefront has no secret configured.
 */

const MAX_TAGS = 50;
const MAX_TAG_LENGTH = 256; // Next.js hard limit per tag

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return Response.json(
      { error: "revalidation not configured (REVALIDATE_SECRET unset)" },
      { status: 503 },
    );
  }
  if (!secretMatches(request.headers.get("x-revalidate-secret"), expected)) {
    return Response.json({ error: "invalid secret" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const tags = (body as { tags?: unknown }).tags;
  if (
    !Array.isArray(tags) ||
    tags.length === 0 ||
    tags.length > MAX_TAGS ||
    !tags.every(
      (t): t is string =>
        typeof t === "string" && t.length > 0 && t.length <= MAX_TAG_LENGTH,
    )
  ) {
    return Response.json(
      { error: `body must be { tags: string[] } (1–${MAX_TAGS} tags)` },
      { status: 400 },
    );
  }

  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }
  return Response.json({ revalidated: tags, now: Date.now() });
}
