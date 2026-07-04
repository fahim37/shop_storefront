import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating-stars";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { SectionHeader } from "@/components/layout/section-header";
import { ProductGrid } from "@/components/product/product-grid";
import { BuyPanel } from "@/components/product/buy-panel";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductDetailSections } from "@/components/product/reviews-section";
import { RecentlyViewedTracker } from "@/components/product/recently-viewed-tracker";
import { fromRecHit, type CardProduct } from "@/lib/api/card";
import { formatCompact, formatRating } from "@/lib/format";
import { renderDescriptionHtml } from "@/lib/sanitize";
import {
  getCategoryBreadcrumbs,
  getProductBySlug,
  getRelatedProducts,
  NotFoundError,
} from "@/lib/api/server";
import type { Category, RecResponse } from "@/lib/api/types";

// Fallback only — review/price/stock/image events revalidate the page's
// cache tags on demand via /api/revalidate (see lib/api/server.ts).
export const revalidate = 3600;

/**
 * No slugs are prerendered at build time, but declaring generateStaticParams
 * opts the route into ISR: each product page is rendered once on first hit,
 * then served as cached static HTML for `revalidate` seconds. Without this a
 * dynamic route re-renders on EVERY request.
 */
export function generateStaticParams() {
  return [];
}

interface PageParams {
  params: Promise<{ slug: string }>;
}

async function settle<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { product } = await getProductBySlug(slug);
    const description =
      product.description?.slice(0, 160) ??
      `Buy ${product.title} on GCL — cash on delivery across Bangladesh.`;
    return {
      title: `${product.title} — GCL`,
      description,
      openGraph: {
        title: product.title,
        description,
        type: "website",
      },
    };
  } catch {
    return {};
  }
}

const DELIVERY_ITEMS = [
  { icon: Truck, title: "Deliver to Dhaka", sub: "2–5 days nationwide" },
  { icon: Wallet, title: "Cash on delivery", sub: "Pay at your door" },
  { icon: RotateCcw, title: "7-day returns", sub: "Free return pickup" },
  { icon: ShieldCheck, title: "1-year warranty", sub: "Seller-backed" },
];

export default async function ProductPage({ params }: PageParams) {
  const { slug } = await params;

  let detail;
  try {
    detail = await getProductBySlug(slug);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const product = detail.product;

  const [related, crumbsChain] = await Promise.all([
    settle<RecResponse>(getRelatedProducts(product.id), {
      items: [],
      placement: "related",
      modelVersion: "v1",
    }),
    settle<Category[]>(getCategoryBreadcrumbs(product.categoryId), []),
  ]);

  const category = crumbsChain.at(-1) ?? null;

  const crumbs: Crumb[] = [
    ...(category
      ? [{ label: category.name, href: `/category/${category.slug}` }]
      : []),
    { label: product.title },
  ];

  const relatedCards: CardProduct[] = related.items.map(fromRecHit);

  // Sanitize the vendor rich-text description HERE, on the server, so the
  // sanitizer (and its parser) never ship to the browser. The client PDP
  // sections receive already-clean HTML. null → legacy plain-text description.
  const descriptionHtml = renderDescriptionHtml(product.description);

  return (
    <div className="wrap py-3 pb-10 sm:py-4 sm:pb-16">
      <Breadcrumbs items={crumbs} className="mb-3 sm:mb-4" />

      {/* Top: gallery + info */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,620px)_1fr] lg:gap-10">
        {/* Left — gallery */}
        <div className="min-w-0">
          <ProductGallery images={detail.images} title={product.title} />
        </div>

        {/* Right — info + buy panel */}
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {product.brandName && (
              <Badge variant="primary" size="md">
                {product.brandName}
              </Badge>
            )}
            <Badge variant="success" size="md">
              <BadgeCheck className="size-3.5" strokeWidth={2.4} /> Verified
              seller
            </Badge>
          </div>

          <h1 className="font-display text-xl font-extrabold leading-snug tracking-tight sm:text-[28px] sm:leading-tight">
            {product.title}
          </h1>

          {/* meta row */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold text-sub sm:gap-x-3 sm:gap-y-1.5 sm:text-[13px]">
            <span className="flex items-center gap-1.5">
              <RatingStars value={product.ratingAverage} size={15} precise />
              <span className="text-ink">
                {formatRating(product.ratingAverage)}
              </span>
            </span>
            <span className="text-faint">
              ({product.ratingCount}{" "}
              {product.ratingCount === 1 ? "rating" : "ratings"})
            </span>
            <span className="text-[oklch(0.8_0.01_255)]">·</span>
            <span className="text-faint">
              {formatCompact(product.salesCount)} sold
            </span>
          </div>

          <BuyPanel detail={detail} />
        </div>
      </div>

      {/* Delivery + vendor strip */}
      <div className="mt-5 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {DELIVERY_ITEMS.map((u) => (
            <div
              key={u.title}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3"
            >
              <u.icon className="size-[18px] shrink-0 text-primary sm:size-5" strokeWidth={1.6} />
              <span className="min-w-0">
                <b className="block truncate text-[12px] font-extrabold sm:text-[12.5px]">
                  {u.title}
                </b>
                <span className="block truncate text-[10.5px] font-semibold text-faint sm:text-[11px]">
                  {u.sub}
                </span>
              </span>
            </div>
          ))}
        </div>

        {product.vendorName && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted px-3 py-2.5 sm:px-4 sm:py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
              <Store className="size-5" strokeWidth={1.6} />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-faint">
                Sold by
              </span>
              <b className="block truncate text-[13.5px] font-extrabold">
                {product.vendorName}
              </b>
            </span>
            <Button asChild variant="outline" size="sm" className="ml-2 shrink-0">
              <Link href={`/search?q=${encodeURIComponent(product.vendorName)}`}>
                Visit store
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Description / Specs / Reviews / Questions — full, stacked (no tabs) */}
      <section className="mt-8 sm:mt-12">
        <ProductDetailSections product={product} descriptionHtml={descriptionHtml} />
      </section>

      {/* You may also like */}
      {relatedCards.length > 0 && (
        <section className="mt-10 sm:mt-14">
          <SectionHeader
            title="You may also like"
            subtitle="Frequently bought together"
          />
          <ProductGrid products={relatedCards} />
        </section>
      )}

      {/* Side-effect: record this view */}
      <RecentlyViewedTracker productId={product.id} />
    </div>
  );
}
