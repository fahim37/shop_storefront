/**
 * Normalized product-card shape + adapters from the various backend payloads.
 * Plain module (no "use client") so both Server and Client Components can use it.
 */
import type {
  ProductCardRow,
  RecHit,
  RecentlyViewedItem,
  SearchHit,
  WishlistItem,
} from "@/lib/api/types";

export interface CardProduct {
  id: string;
  slug: string;
  title: string;
  thumbnailMediaId: string | null;
  pricePaisa: string | null;
  comparePaisa?: string | null;
  ratingAverage?: number | string | null;
  ratingCount?: number;
  salesCount?: number;
  vendorName?: string | null;
  vendorSlug?: string | null;
}

export function fromProductRow(p: ProductCardRow): CardProduct {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    thumbnailMediaId: p.thumbnailMediaId,
    pricePaisa: p.minPricePaisa,
    ratingAverage: p.ratingAverage,
    ratingCount: p.ratingCount,
    salesCount: p.salesCount,
    vendorName: p.vendorName,
    vendorSlug: p.vendorSlug,
  };
}

export function fromSearchHit(h: SearchHit): CardProduct {
  return {
    id: h.productId,
    slug: h.slug,
    title: h.title,
    thumbnailMediaId: h.thumbnailMediaId,
    pricePaisa: h.pricePaisa,
    ratingAverage: h.ratingAverage,
    vendorName: h.vendorName,
    vendorSlug: h.vendorSlug,
  };
}

export function fromRecHit(h: RecHit): CardProduct {
  return {
    id: h.productId,
    slug: h.slug,
    title: h.title,
    thumbnailMediaId: h.thumbnailMediaId,
    pricePaisa: h.pricePaisa,
    ratingAverage: h.ratingAverage,
    vendorName: h.vendorName,
    vendorSlug: h.vendorSlug,
  };
}

export function fromWishlist(w: WishlistItem): CardProduct {
  return {
    id: w.productId,
    slug: w.productSlug,
    title: w.productTitle,
    thumbnailMediaId: w.thumbnailMediaId,
    pricePaisa: w.minPricePaisa,
    vendorName: w.vendorName,
    vendorSlug: w.vendorSlug,
  };
}

export function fromRecentlyViewed(r: RecentlyViewedItem): CardProduct {
  return {
    id: r.productId,
    slug: r.productSlug,
    title: r.productTitle,
    thumbnailMediaId: r.thumbnailMediaId,
    pricePaisa: r.minPricePaisa,
    vendorName: r.vendorName,
    vendorSlug: r.vendorSlug,
  };
}
