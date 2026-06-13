import Link from "next/link";
import {
  RotateCcw,
  ShieldCheck,
  Store,
  Tag,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignPanel } from "@/components/home/campaign-panel";
import { HeroBanners } from "@/components/home/hero-banners";
import { HeroSlider } from "@/components/home/hero-slider";
import { SectionHeader } from "@/components/layout/section-header";
import { ProductGrid } from "@/components/product/product-grid";
import { categoryIcon } from "@/lib/category-icons";
import { fromProductRow, fromRecHit, type CardProduct } from "@/lib/api/card";
import {
  getCategoryTree,
  getHomepage,
  getHomeRecommendations,
  getProductsPage,
} from "@/lib/api/server";
import type {
  CategoryNode,
  HomepageBannerConfig,
  HomepageBlock,
  HomepageCarouselConfig,
} from "@/lib/api/types";
import { resolveMediaPath } from "@/lib/media";

export const revalidate = 120;

async function settle<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

const TILE_TONES = [
  "bg-[oklch(0.93_0.035_255)] text-[oklch(0.38_0.12_258)]",
  "bg-[oklch(0.93_0.035_225)] text-[oklch(0.38_0.09_230)]",
  "bg-[oklch(0.94_0.03_95)] text-[oklch(0.42_0.09_80)]",
  "bg-[oklch(0.94_0.025_165)] text-[oklch(0.37_0.08_165)]",
  "bg-[oklch(0.94_0.02_280)] text-[oklch(0.4_0.1_278)]",
];

export default async function HomePage() {
  const [tree, recs, productsPage, blocks] = await Promise.all([
    settle(getCategoryTree(), [] as CategoryNode[]),
    settle(getHomeRecommendations(), { items: [], placement: "home", modelVersion: "v1" }),
    settle(getProductsPage({ limit: 10 }), { data: [] }),
    settle(getHomepage(), [] as HomepageBlock[]),
  ]);

  // Flat category list for the circles row — roots first, then their
  // children, in tree order (Daraz-style dense row). Capped at 12.
  const circleCats = tree
    .flatMap((root) => [root, ...(root.children ?? [])])
    .slice(0, 12);
  const bestSellers: CardProduct[] = recs.items.slice(0, 10).map(fromRecHit);
  const fresh: CardProduct[] = productsPage.data.map(fromProductRow);
  const flash = fresh.slice(0, 8);
  const newArrivals = fresh.slice(5, 10);

  // Admin-managed hero: first active carousel block + every banner block
  // (already filtered/sorted by the backend). Falls back to the designed
  // HeroSlider until the admin publishes a carousel with at least one slide.
  const carouselBlock = blocks.find((b) => b.kind === "carousel");
  const heroSlides = carouselBlock
    ? ((carouselBlock.config as unknown as HomepageCarouselConfig).slides ?? []).filter(
        (s) => Boolean(s.imageMediaId),
      )
    : [];
  const heroBanners = blocks
    .filter((b) => b.kind === "banner")
    .map((b) => {
      const cfg = b.config as unknown as HomepageBannerConfig;
      return {
        imageMediaId: cfg.imageMediaId,
        linkUrl: cfg.linkUrl,
        altText: cfg.altText,
        title: b.title ?? undefined,
      };
    })
    .filter((b) => Boolean(b.imageMediaId));

  return (
    <div className="flex flex-col gap-8 pb-12 pt-4">
      {/* Hero — admin-managed banners when published, designed fallback otherwise */}
      <section className="wrap">
        <h1 className="sr-only">GCL — Bangladesh&apos;s online marketplace</h1>
        {heroSlides.length > 0 ? (
          <HeroBanners carousel={{ slides: heroSlides }} banners={heroBanners} />
        ) : (
          <HeroSlider />
        )}
      </section>

      {/* USP strip */}
      <section className="wrap -mt-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Wallet, title: "Cash on delivery", sub: "Pay at your door" },
            { icon: ShieldCheck, title: "Authentic products", sub: "Verified seller KYC" },
            { icon: Truck, title: "64-district delivery", sub: "2–5 days nationwide" },
            { icon: RotateCcw, title: "7-day returns", sub: "Free return pickup" },
          ].map((u) => (
            <div
              key={u.title}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
            >
              <u.icon className="size-6 shrink-0 text-primary" strokeWidth={1.5} />
              <span className="min-w-0">
                <b className="block truncate text-[13px] font-extrabold">{u.title}</b>
                <span className="block truncate text-[11.5px] font-semibold text-faint">
                  {u.sub}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Category circles — dense Daraz-style row (roots + subcategories).
          Horizontal scroll on mobile; centered with snug fixed gaps on lg
          (NOT stretched across the rail — that looks sparse with few cats). */}
      {circleCats.length > 0 && (
        <section className="wrap">
          <SectionHeader title="Shop by category" subtitle="Browse every department" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1 lg:justify-center lg:gap-9 lg:overflow-visible lg:pb-0">
            {circleCats.map((cat, i) => {
              const Icon = categoryIcon(cat.slug);
              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="group flex w-[76px] shrink-0 flex-col items-center gap-2.5 lg:w-[88px]"
                >
                  {cat.iconUrl ? (
                    <span className="block size-16 overflow-hidden rounded-full shadow-[var(--shadow-card)] ring-1 ring-border transition-all group-hover:-translate-y-0.5 group-hover:ring-2 group-hover:ring-primary/50 lg:size-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMediaPath(cat.iconUrl)!}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full scale-[1.38] object-cover transition-transform duration-300 group-hover:scale-[1.48]"
                      />
                    </span>
                  ) : (
                    <span
                      className={`flex size-16 items-center justify-center rounded-full transition-all group-hover:-translate-y-0.5 lg:size-20 ${TILE_TONES[i % TILE_TONES.length]}`}
                    >
                      <Icon className="size-7 lg:size-8" strokeWidth={1.5} />
                    </span>
                  )}
                  <b className="line-clamp-2 w-full text-center text-[12px] font-extrabold leading-tight text-ink group-hover:text-primary">
                    {cat.name}
                  </b>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Best sellers */}
      {bestSellers.length > 0 && (
        <section className="wrap">
          <SectionHeader
            title="Best sellers this week"
            subtitle="Most ordered across Bangladesh"
            linkLabel="View all"
            linkHref="/search?q=best"
          />
          <ProductGrid products={bestSellers.slice(0, 5)} />
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="wrap">
          <SectionHeader
            title="New arrivals"
            subtitle="Fresh from local stores"
            linkLabel="View all"
            linkHref="/search?q=new&sort=newest"
          />
          <ProductGrid products={newArrivals} />
        </section>
      )}

      {/* Dual promo */}
      <section className="wrap grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-navy px-5 py-5 text-white sm:gap-5 sm:px-7 sm:py-7">
          <Store className="size-8 shrink-0 sm:size-9" strokeWidth={1.4} />
          <div className="min-w-0 flex-1 basis-40">
            <h3 className="font-display text-base font-extrabold sm:text-lg">Sell on GCL</h3>
            <p className="mt-0.5 text-[12.5px] font-semibold opacity-75">
              1,200+ sellers already ship to all 64 districts.
            </p>
          </div>
          <Button asChild variant="soft" className="shrink-0">
            <Link href="/pages/about">Open a store</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-amber px-5 py-5 text-blue-deep sm:gap-5 sm:px-7 sm:py-7">
          <Tag className="size-8 shrink-0 sm:size-9" strokeWidth={1.4} />
          <div className="min-w-0 flex-1 basis-40">
            <h3 className="font-display text-base font-extrabold sm:text-lg">
              <span className="bn">৳</span>100 off first order
            </h3>
            <p className="mt-0.5 text-[12.5px] font-semibold opacity-75">
              Use voucher WELCOME100 at checkout.
            </p>
          </div>
          <Button asChild variant="navy" className="shrink-0">
            <Link href="/search?q=">Claim</Link>
          </Button>
        </div>
      </section>

      {/* Campaign panel — Daraz-style "bazar" board, anchored at the bottom */}
      <CampaignPanel products={flash} title="Mega Bazar" subtitle="Deals of the month" />
    </div>
  );
}
