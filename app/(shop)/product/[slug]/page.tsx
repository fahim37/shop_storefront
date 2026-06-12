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
import { ReviewsSection } from "@/components/product/reviews-section";
import { RecentlyViewedTracker } from "@/components/product/recently-viewed-tracker";
import { fromRecHit, type CardProduct } from "@/lib/api/card";
import { formatCompact, formatRating } from "@/lib/format";
import {
  getCategoryBreadcrumbs,
  getProductBySlug,
  getRelatedProducts,
  NotFoundError,
} from "@/lib/api/server";
import type { Category, RecResponse } from "@/lib/api/types";

export const revalidate = 60;

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

  return (
    <div className="wrap py-4 pb-16">
      <Breadcrumbs items={crumbs} className="mb-4" />

      {/* Top: gallery + info */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-10">
        {/* Left — gallery */}
        <div className="min-w-0">
          <ProductGallery images={detail.images} title={product.title} />
        </div>

        {/* Right — info + buy panel */}
        <div className="flex min-w-0 flex-col gap-4">
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

          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px]">
            {product.title}
          </h1>

          {/* meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-bold text-sub">
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
      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {DELIVERY_ITEMS.map((u) => (
            <div
              key={u.title}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <u.icon className="size-5 shrink-0 text-primary" strokeWidth={1.6} />
              <span className="min-w-0">
                <b className="block truncate text-[12.5px] font-extrabold">
                  {u.title}
                </b>
                <span className="block truncate text-[11px] font-semibold text-faint">
                  {u.sub}
                </span>
              </span>
            </div>
          ))}
        </div>

        {product.vendorName && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3">
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

      {/* You may also like */}
      {relatedCards.length > 0 && (
        <section className="mt-12">
          <SectionHeader
            title="You may also like"
            subtitle="Frequently bought together"
          />
          <ProductGrid products={relatedCards} />
        </section>
      )}

      {/* Description / Specs / Reviews / Questions */}
      <ReviewsSection product={product} />

      {/* Side-effect: record this view */}
      <RecentlyViewedTracker productId={product.id} />
    </div>
  );
}
