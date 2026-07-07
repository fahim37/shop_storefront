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
import { ChatWithSellerButton } from "@/components/product/chat-with-seller-button";
import { PdpTopBar } from "@/components/product/pdp-top-bar";
import { fromRecHit, type CardProduct } from "@/lib/api/card";
import { cn } from "@/lib/utils";
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

// Each trust item carries its own accent: a soft-tinted icon tile plus a
// fainter matching card wash, so the strip reads as four distinct assurances.
const DELIVERY_ITEMS = [
  {
    icon: Wallet,
    title: "Cash on delivery",
    sub: "Pay at your door",
    tile: "bg-primary/10 text-primary",
    card: "border-primary/10 bg-primary/5",
  },
  {
    icon: ShieldCheck,
    title: "Authentic products",
    sub: "Verified seller KYC",
    tile: "bg-amber/20 text-amber-deep",
    card: "border-amber/25 bg-amber/10",
  },
  {
    icon: Truck,
    title: "64-district delivery",
    sub: "2–5 days nationwide",
    tile: "bg-green/10 text-green",
    card: "border-green/15 bg-green/5",
  },
  {
    icon: RotateCcw,
    title: "7-day returns",
    sub: "Free return pickup",
    tile: "bg-red/10 text-red",
    card: "border-red/10 bg-red/5",
  },
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
    // Mobile bottom padding clears the fixed PdpActionBar; breadcrumbs yield
    // to the floating PdpTopBar chips, which overlay the gallery Daraz-style.
    <div className="wrap py-3 pb-32 sm:py-4 md:pb-16">
      <PdpTopBar title={product.title} />
      <Breadcrumbs items={crumbs} className="mb-3 max-md:hidden sm:mb-4" />

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

          <h1 className="font-display text-xl font-extrabold leading-snug tracking-tight sm:text-28 sm:leading-tight">
            {product.title}
          </h1>

          {/* meta row */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold text-sub sm:gap-x-3 sm:gap-y-1.5 sm:text-13">
            <span className="flex items-center gap-1.5">
              <RatingStars value={product.ratingAverage} size={15} precise />
              <span className="text-ink">
                {formatRating(product.ratingAverage)}
              </span>
            </span>
            <a
              href="#reviews"
              className="text-faint underline-offset-2 hover:text-primary hover:underline"
            >
              ({product.ratingCount}{" "}
              {product.ratingCount === 1 ? "rating" : "ratings"})
            </a>
            <span className="text-[oklch(0.8_0.01_255)]">·</span>
            <span className="text-faint">
              {formatCompact(product.salesCount)} sold
            </span>
          </div>

          <BuyPanel detail={detail} />
        </div>
      </div>

      {/* Delivery + vendor strip. Flex-col on mobile (grid only at lg): a bare
          `grid` here is a single `auto`-sized column that grows to its content's
          max-content and pushes the page wider than the viewport. */}
      <div className="mt-5 flex flex-col gap-3 sm:mt-8 sm:gap-4 lg:grid lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {DELIVERY_ITEMS.map((u) => (
            <div
              key={u.title}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-2.5 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3",
                u.card,
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg sm:size-10",
                  u.tile,
                )}
              >
                <u.icon className="size-[18px] sm:size-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                {/* titles wrap (max 2 lines) — mid-word ellipsis reads broken on 390px */}
                <b className="line-clamp-2 text-xs font-extrabold leading-tight sm:text-13">
                  {u.title}
                </b>
                <span className="block truncate text-11 font-semibold text-faint">
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
              <span className="block text-11 font-bold uppercase tracking-wide text-faint">
                Sold by
              </span>
              <b className="block truncate text-sm font-extrabold">
                {product.vendorName}
              </b>
            </span>
            <div className="ml-2 flex shrink-0 items-center gap-2">
              <ChatWithSellerButton
                vendorId={product.vendorId}
                vendorName={product.vendorName}
                productId={product.id}
                productTitle={product.title}
              />
              <Button asChild variant="outline" size="sm">
                <Link
                  href={
                    product.vendorSlug
                      ? `/store/${product.vendorSlug}`
                      : `/search?q=${encodeURIComponent(product.vendorName)}`
                  }
                >
                  Visit store
                </Link>
              </Button>
            </div>
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
