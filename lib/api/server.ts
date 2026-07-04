/**
 * Server-side fetchers for PUBLIC catalog/content data, used by Server
 * Components for SEO + ISR. These never send auth (public endpoints) and
 * control caching via Next's `revalidate`. Interactive/user data is fetched
 * client-side through the TanStack Query hooks instead.
 */
import "server-only";
import { API_BASE_URL } from "@/lib/config";
import type {
  Category,
  CategoryNode,
  CmsPage,
  CursorMeta,
  HomepageBlock,
  ProductCardRow,
  ProductDetail,
  RecResponse,
} from "@/lib/api/types";

/**
 * Fallback ISR window. Freshness is EVENT-DRIVEN: the backend POSTs
 * invalidated cache tags to /api/revalidate when catalog data changes
 * (reviews, product/price/image edits, stock bucket changes, category/
 * homepage/CMS edits), so this timer is only the safety net for missed
 * events. Keep every fetch below tagged so those webhooks can reach it.
 */
const DEFAULT_REVALIDATE = 3600; // seconds

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const base = `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!params) return base;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") search.append(k, String(v));
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

interface GetOptions {
  params?: Record<string, string | number | undefined>;
  revalidate?: number;
  tags?: string[];
}

/** Fetch + unwrap `{ data }`. Throws NotFoundError on 404, Error otherwise. */
async function serverGet<T>(path: string, opts: GetOptions = {}): Promise<T> {
  const res = await fetch(buildUrl(path, opts.params), {
    headers: { Accept: "application/json" },
    next: { revalidate: opts.revalidate ?? DEFAULT_REVALIDATE, tags: opts.tags },
  });
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error(`Request to ${path} failed (${res.status})`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

/** Like serverGet but also returns the `meta` envelope (paginated lists). */
async function serverGetList<T>(
  path: string,
  opts: GetOptions = {},
): Promise<{ data: T[]; meta?: CursorMeta }> {
  const res = await fetch(buildUrl(path, opts.params), {
    headers: { Accept: "application/json" },
    next: { revalidate: opts.revalidate ?? DEFAULT_REVALIDATE, tags: opts.tags },
  });
  if (!res.ok) throw new Error(`Request to ${path} failed (${res.status})`);
  const json = (await res.json()) as { data: T[]; meta?: CursorMeta };
  return { data: json.data, meta: json.meta };
}

/* ---- typed public fetchers ---- */

export function getCategoryTree() {
  return serverGet<CategoryNode[]>("/categories", { tags: ["categories"] });
}

export function getCategoryBySlug(slug: string) {
  return serverGet<Category>(`/categories/${slug}`, { tags: ["categories"] });
}

export function getCategoryBreadcrumbs(id: string) {
  return serverGet<Category[]>(`/categories/${id}/breadcrumbs`, { tags: ["categories"] });
}

export function getProductsPage(params: {
  categoryId?: string;
  brandId?: string;
  minPricePaisa?: string;
  maxPricePaisa?: string;
  /** newest | price_asc | price_desc | rating_desc | best_selling */
  sort?: string;
  limit?: number;
  cursor?: string;
}) {
  return serverGetList<ProductCardRow>("/products", {
    params,
    tags: ["products"],
  });
}

/**
 * Fetch published product cards for an explicit id list (admin-pinned
 * homepage rails / curated collections). The backend returns them in its own
 * listing order, so callers re-order to match `ids`. Returns [] for an empty
 * list without hitting the network.
 */
export async function getProductsByIds(ids: string[]) {
  const clean = ids.filter(Boolean);
  if (clean.length === 0) return { data: [] as ProductCardRow[] };
  return serverGetList<ProductCardRow>("/products", {
    params: { ids: clean.join(","), limit: Math.min(clean.length, 100) },
    tags: ["products"],
  });
}

export async function getProductBySlug(slug: string) {
  return serverGet<ProductDetail>(`/products/${slug}`, {
    tags: ["products", `product:${slug}`],
  });
}

export function getRelatedProducts(id: string) {
  return serverGet<RecResponse>(`/products/${id}/recommendations/related`, {
    // Rails embed product cards (price/rating), so product events must
    // reach them — hence the `products` tag.
    tags: ["products"],
  });
}

export function getHomepageBlocks() {
  return serverGet<{ blocks: HomepageBlock[] }>("/homepage", {
    tags: ["homepage"],
  });
}

/**
 * Active homepage blocks as a flat array (the backend already filters to
 * active + in-schedule and sorts by `sortOrder`). Tolerates a missing
 * `blocks` key so the home page can fall back to its designed hero.
 */
export async function getHomepage(): Promise<HomepageBlock[]> {
  const { blocks } = await getHomepageBlocks();
  return blocks ?? [];
}

export function getHomeRecommendations() {
  return serverGet<RecResponse>("/me/recommendations/home", { tags: ["products"] });
}

export function getCmsPage(slug: string) {
  return serverGet<CmsPage>(`/pages/${slug}`, { tags: [`page:${slug}`] });
}
