/**
 * Server-side fetchers for PUBLIC catalog/content data, used by Server
 * Components for SEO + ISR. These never send auth (public endpoints) and
 * control caching via Next's `revalidate`. Interactive/user data is fetched
 * client-side through the TanStack Query hooks instead.
 */
import "server-only";
import { API_BASE_URL } from "@/lib/config";
import type {
  Brand,
  Category,
  CategoryAttribute,
  CategoryNode,
  CmsPage,
  CursorMeta,
  HomepageBlock,
  ProductCardRow,
  ProductDetail,
  RecResponse,
  SearchResponse,
} from "@/lib/api/types";

const DEFAULT_REVALIDATE = 120; // seconds

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
  return serverGet<CategoryNode[]>("/categories", { revalidate: 300, tags: ["categories"] });
}

export function getCategoryBySlug(slug: string) {
  return serverGet<Category>(`/categories/${slug}`, { tags: ["categories"] });
}

export function getCategoryBreadcrumbs(id: string) {
  return serverGet<Category[]>(`/categories/${id}/breadcrumbs`, { tags: ["categories"] });
}

export function getCategoryAttributes(id: string) {
  return serverGet<CategoryAttribute[]>(`/categories/${id}/attributes`, {
    revalidate: 300,
  });
}

export function getBrands() {
  return serverGet<Brand[]>("/brands", { revalidate: 300, tags: ["brands"] });
}

export function getProductsPage(params: {
  categoryId?: string;
  brandId?: string;
  minPricePaisa?: string;
  maxPricePaisa?: string;
  limit?: number;
  cursor?: string;
}) {
  return serverGetList<ProductCardRow>("/products", {
    params,
    revalidate: 60,
    tags: ["products"],
  });
}

export async function getProductBySlug(slug: string) {
  return serverGet<ProductDetail>(`/products/${slug}`, {
    revalidate: 60,
    tags: ["products", `product:${slug}`],
  });
}

export function getRelatedProducts(id: string) {
  return serverGet<RecResponse>(`/products/${id}/recommendations/related`, {
    revalidate: 120,
  });
}

export function getHomepageBlocks() {
  return serverGet<{ blocks: HomepageBlock[] }>("/homepage", {
    revalidate: 120,
    tags: ["homepage"],
  });
}

export function getHomeRecommendations() {
  return serverGet<RecResponse>("/me/recommendations/home", { revalidate: 120 });
}

export function getCmsPage(slug: string) {
  return serverGet<CmsPage>(`/pages/${slug}`, { revalidate: 300, tags: [`page:${slug}`] });
}

export function searchProductsServer(params: {
  q: string;
  sort?: string;
  limit?: number;
}) {
  return serverGet<SearchResponse>("/search", { params, revalidate: 0 });
}
