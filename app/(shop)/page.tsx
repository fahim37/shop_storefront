import { HeroBanners } from "@/components/home/hero-banners";
import { HeroSlider } from "@/components/home/hero-slider";
import { HomepageRenderer } from "@/components/home/blocks/homepage-renderer";
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

// Fallback only — homepage-block and product events revalidate the page's
// cache tags on demand via /api/revalidate (see lib/api/server.ts).
export const revalidate = 3600;

async function settle<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function HomePage() {
  const [tree, recs, bestPage, newPage, blocks] = await Promise.all([
    settle(getCategoryTree(), [] as CategoryNode[]),
    settle(getHomeRecommendations(), { items: [], placement: "home", modelVersion: "v1" }),
    settle(getProductsPage({ limit: 20, sort: "best_selling" }), { data: [] }),
    settle(getProductsPage({ limit: 20, sort: "newest" }), { data: [] }),
    settle(getHomepage(), [] as HomepageBlock[]),
  ]);

  // Product feeds the fixed sections resolve from. `recommended` rides the
  // recommendations endpoint; if it's empty (anonymous/cold) we fall back to
  // best sellers so the "Recommended for you" rail is never blank.
  const bestsellers: CardProduct[] = bestPage.data.map(fromProductRow);
  const newest: CardProduct[] = newPage.data.map(fromProductRow);
  const recommended: CardProduct[] =
    recs.items.length > 0 ? recs.items.map(fromRecHit) : bestsellers;

  // Hero — first active carousel block → big slider; banner blocks → side
  // tiles. Falls back to the designed HeroSlider until a carousel is published.
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
    <div className="flex flex-col gap-8 pb-12">
      {/* Hero — admin-managed banners when published, designed fallback otherwise.
          Full-bleed (edge to edge) on mobile; stays inside the wrap on md+. */}
      <section className="wrap">
        <h1 className="sr-only">Cartivo — Bangladesh&apos;s online marketplace</h1>
        <div className="-mx-4 md:mx-0">
          {heroSlides.length > 0 ? (
            <HeroBanners carousel={{ slides: heroSlides }} banners={heroBanners} />
          ) : (
            <HeroSlider />
          )}
        </div>
      </section>

      {/* Fixed homepage sections — each renders its default, overridable by an
          admin section block (matched by slot). */}
      <HomepageRenderer
        blocks={blocks}
        feeds={{ bestsellers, newest, recommended, tree }}
      />
    </div>
  );
}
