import Link from "next/link";
import {
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Store,
  Tag,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/layout/section-header";
import { ProductGrid } from "@/components/product/product-grid";
import { categoryIcon } from "@/lib/category-icons";
import { fromProductRow, fromRecHit, type CardProduct } from "@/lib/api/card";
import {
  getCategoryTree,
  getHomeRecommendations,
  getProductsPage,
} from "@/lib/api/server";
import type { CategoryNode } from "@/lib/api/types";

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
  const [tree, recs, productsPage] = await Promise.all([
    settle(getCategoryTree(), [] as CategoryNode[]),
    settle(getHomeRecommendations(), { items: [], placement: "home", modelVersion: "v1" }),
    settle(getProductsPage({ limit: 10 }), { data: [] }),
  ]);

  const roots = tree.slice(0, 5);
  const bestSellers: CardProduct[] = recs.items.slice(0, 10).map(fromRecHit);
  const fresh: CardProduct[] = productsPage.data.map(fromProductRow);
  const flash = fresh.slice(0, 5);
  const newArrivals = fresh.slice(5, 10);

  return (
    <div className="flex flex-col gap-12 pb-16 pt-5">
      {/* Hero */}
      <section className="wrap">
        <div className="relative flex min-h-[300px] flex-col justify-center overflow-hidden rounded-2xl bg-primary px-6 py-10 text-white sm:px-12 md:min-h-[360px]">
          <div className="absolute -right-24 -top-24 size-[420px] rounded-full bg-[oklch(0.56_0.19_258)]" />
          <div className="absolute -bottom-40 right-44 size-[300px] rounded-full bg-[oklch(0.42_0.2_261)]" />
          <div className="relative z-10 max-w-xl">
            <span className="inline-block -rotate-2 rounded-md bg-amber px-3.5 py-1.5 font-display text-sm font-extrabold tracking-wide text-blue-deep shadow-[3px_3px_0_oklch(0.3_0.12_262)]">
              DEALS WEEK · UP TO 50% OFF
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold uppercase leading-[1.02] tracking-tight sm:text-5xl md:text-[54px]">
              Big brands.
              <br />
              Local <em className="not-italic text-amber">prices.</em>
            </h1>
            <p className="mt-4 max-w-md text-sm opacity-85 sm:text-[15px]">
              36,000+ products from 1,200 verified Bangladeshi sellers — cash on
              delivery, everywhere.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button asChild variant="accent" size="lg">
                <Link href="/search?q=flash">
                  Shop flash sale <ArrowRight className="size-4" strokeWidth={2.4} />
                </Link>
              </Button>
              <Button asChild variant="line" size="lg">
                <Link href="/search?q=">Browse stores</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* USP strip */}
      <section className="wrap -mt-6">
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

      {/* Category tiles */}
      {roots.length > 0 && (
        <section className="wrap">
          <SectionHeader title="Shop by category" subtitle="Browse every department" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {roots.map((cat, i) => {
              const Icon = categoryIcon(cat.slug);
              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className={`flex items-center gap-3 rounded-xl px-4 py-4 transition-transform hover:-translate-y-0.5 ${TILE_TONES[i % TILE_TONES.length]}`}
                >
                  <Icon className="size-7 shrink-0" strokeWidth={1.5} />
                  <span className="min-w-0">
                    <b className="block truncate text-[13.5px] font-extrabold leading-tight">
                      {cat.name}
                    </b>
                    <span className="text-[11px] font-bold opacity-60">
                      {cat.children?.length ?? 0} subcategories
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Flash sale */}
      {flash.length > 0 && (
        <section className="wrap">
          <SectionHeader
            title="Flash sale"
            subtitle="New deals every day"
            linkLabel="See all deals"
            linkHref="/search?q=flash"
            extra={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.96_0.02_25)] px-2.5 py-1 text-[11.5px] font-extrabold text-red">
                <Zap className="size-3" strokeWidth={2.4} /> Ends soon
              </span>
            }
          />
          <ProductGrid products={flash} />
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
        <div className="flex items-center gap-5 rounded-2xl bg-navy px-7 py-7 text-white">
          <Store className="size-9 shrink-0" strokeWidth={1.4} />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-extrabold">Sell on GCL</h3>
            <p className="mt-0.5 text-[12.5px] font-semibold opacity-75">
              1,200+ sellers already ship to all 64 districts.
            </p>
          </div>
          <Button asChild variant="soft" className="shrink-0">
            <Link href="/pages/about">Open a store</Link>
          </Button>
        </div>
        <div className="flex items-center gap-5 rounded-2xl bg-amber px-7 py-7 text-blue-deep">
          <Tag className="size-9 shrink-0" strokeWidth={1.4} />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-extrabold">
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
    </div>
  );
}
