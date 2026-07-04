import { fromProductRow, type CardProduct } from "@/lib/api/card";
import { getProductsByIds } from "@/lib/api/server";
import type {
  CategoryNode,
  HomepageBlock,
  HomepageCampaignPanelConfig,
  HomepageCategoryCirclesConfig,
  HomepagePromoCard,
  HomepagePromoGridConfig,
  HomepageProductRailConfig,
  HomepageUspItem,
  HomepageUspStripConfig,
  ProductSource,
} from "@/lib/api/types";

import { CampaignPanel } from "@/components/home/campaign-panel";
import { CategoryCircles } from "@/components/home/blocks/category-circles";
import { ProductRail } from "@/components/home/blocks/product-rail";
import { RecommendedRail } from "@/components/home/blocks/recommended-rail";
import { PromoGrid } from "@/components/home/blocks/promo-grid";
import { UspStrip } from "@/components/home/blocks/usp-strip";

/**
 * Renders the homepage body as a FIXED, ordered list of sections. Each section
 * has a built-in default (so the page is always complete out of the box) and
 * can be overridden by an admin-managed block matched by `config.slot`:
 *
 *   - block missing            → render the default
 *   - block present, inactive  → hide the section
 *   - block present, active    → render with the block's overrides applied
 *
 * Dynamic product sources resolve from feeds the page already fetched
 * (bestsellers / newest / recommendations); `manual` pins are fetched here in a
 * single batched call across every overridden section.
 */

export interface HomepageFeeds {
  bestsellers: CardProduct[];
  newest: CardProduct[];
  recommended: CardProduct[];
  tree: CategoryNode[];
}

/** Stable slot ids — MUST match the admin's section definitions. */
export const SECTION_SLOTS = {
  usp: "usp",
  categories: "categories",
  bestSellers: "best_sellers",
  newArrivals: "new_arrivals",
  promos: "promos",
  megaBazar: "mega_bazar",
  recommended: "recommended",
} as const;

/* ----------------------------------- defaults ----------------------------- */

const DEFAULT_USP: HomepageUspItem[] = [
  { icon: "wallet", title: "Cash on delivery", subtitle: "Pay at your door" },
  { icon: "shield", title: "Authentic products", subtitle: "Verified seller KYC" },
  { icon: "truck", title: "64-district delivery", subtitle: "2–5 days nationwide" },
  { icon: "returns", title: "7-day returns", subtitle: "Free return pickup" },
];

const DEFAULT_PROMOS: HomepagePromoCard[] = [
  {
    title: "Sell on GCL",
    subtitle: "1,200+ sellers already ship to all 64 districts.",
    ctaLabel: "Open a store",
    ctaHref: "/pages/about",
    tone: "navy",
    icon: "store",
  },
  {
    title: "৳100 off first order",
    subtitle: "Use voucher WELCOME100 at checkout.",
    ctaLabel: "Claim",
    ctaHref: "/search?q=",
    tone: "amber",
    icon: "tag",
  },
];

/* ----------------------------------- helpers ------------------------------ */

function slotOf(block: HomepageBlock): string | undefined {
  const slot = (block.config as { slot?: unknown }).slot;
  return typeof slot === "string" ? slot : undefined;
}

function flattenCategories(tree: CategoryNode[]): CategoryNode[] {
  return tree.flatMap((root) => [root, ...(root.children ?? [])]);
}

function resolveCategories(
  tree: CategoryNode[],
  categoryIds: string[] | undefined,
  limit: number | undefined,
): CategoryNode[] {
  const flat = flattenCategories(tree);
  if (categoryIds && categoryIds.length > 0) {
    const byId = new Map(flat.map((c) => [c.id, c]));
    return categoryIds
      .map((id) => byId.get(id))
      .filter((c): c is CategoryNode => Boolean(c));
  }
  return flat.slice(0, limit ?? 12);
}

function resolveProducts(
  source: ProductSource | undefined,
  productIds: string[] | undefined,
  limit: number | undefined,
  feeds: HomepageFeeds,
  manual: Map<string, CardProduct>,
): CardProduct[] {
  const src = source ?? "bestsellers";
  let list: CardProduct[];
  if (src === "manual") {
    list = (productIds ?? [])
      .map((id) => manual.get(id))
      .filter((p): p is CardProduct => Boolean(p));
  } else if (src === "newest") {
    list = feeds.newest;
  } else if (src === "recommendations") {
    list = feeds.recommended;
  } else {
    list = feeds.bestsellers;
  }
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

/* ------------------------------ renderer ---------------------------------- */

export async function HomepageRenderer({
  blocks,
  feeds,
}: {
  blocks: HomepageBlock[];
  feeds: HomepageFeeds;
}) {
  // Index the admin's section overrides by slot.
  const bySlot = new Map<string, HomepageBlock>();
  for (const b of blocks) {
    const slot = slotOf(b);
    if (slot) bySlot.set(slot, b);
  }

  // Batch-fetch every pinned (manual) product across all overridden sections.
  const manualIds = new Set<string>();
  for (const b of blocks) {
    if (b.kind === "product_rail" || b.kind === "campaign_panel") {
      const cfg = b.config as unknown as HomepageProductRailConfig;
      if (cfg.source === "manual") for (const id of cfg.productIds ?? []) manualIds.add(id);
    }
  }
  const manual = new Map<string, CardProduct>();
  if (manualIds.size > 0) {
    const res = await getProductsByIds([...manualIds]);
    for (const row of res.data) manual.set(row.id, fromProductRow(row));
  }

  /* --- per-section resolvers (default ⊕ override) --- */

  const usp = (() => {
    const block = bySlot.get(SECTION_SLOTS.usp);
    if (block && !block.isActive) return null;
    const items = block
      ? ((block.config as unknown as HomepageUspStripConfig).items ?? DEFAULT_USP)
      : DEFAULT_USP;
    return <UspStrip key="usp" items={items} />;
  })();

  const categories = (() => {
    const block = bySlot.get(SECTION_SLOTS.categories);
    if (block && !block.isActive) return null;
    const cfg = (block?.config ?? {}) as unknown as HomepageCategoryCirclesConfig;
    return (
      <CategoryCircles
        key="categories"
        title={block?.title ?? "Shop by category"}
        subtitle={cfg.subtitle ?? "Browse every department"}
        categories={resolveCategories(feeds.tree, cfg.categoryIds, cfg.limit)}
      />
    );
  })();

  const productRail = (
    slot: string,
    defaults: {
      title: string;
      subtitle: string;
      source: ProductSource;
      limit: number;
      linkLabel: string;
      linkHref: string;
      carousel?: boolean;
    },
  ) => {
    const block = bySlot.get(slot);
    if (block && !block.isActive) return null;
    const cfg = (block?.config ?? {}) as unknown as HomepageProductRailConfig;
    const source = cfg.source ?? defaults.source;
    const limit = cfg.limit ?? defaults.limit;
    // "View all" points to the auto rail's browse page. For hand-picked
    // (manual) sections it's a finite list, so hide the link unless the admin
    // set an explicit one.
    const isManual = source === "manual";
    const linkHref = cfg.linkUrl ?? (isManual ? undefined : defaults.linkHref);
    const linkLabel = linkHref ? (cfg.linkLabel ?? defaults.linkLabel) : undefined;
    const railProps = {
      title: block?.title ?? defaults.title,
      subtitle: cfg.subtitle ?? defaults.subtitle,
      linkLabel,
      linkHref,
      carousel: defaults.carousel,
      products: resolveProducts(source, cfg.productIds, limit, feeds, manual),
    };
    // Recommendation rails get the client wrapper that personalizes for
    // signed-in shoppers after hydration (the server feed is anonymous).
    return source === "recommendations" ? (
      <RecommendedRail key={slot} {...railProps} limit={limit} />
    ) : (
      <ProductRail key={slot} {...railProps} />
    );
  };

  const promos = (() => {
    const block = bySlot.get(SECTION_SLOTS.promos);
    if (block && !block.isActive) return null;
    const cards = block
      ? ((block.config as unknown as HomepagePromoGridConfig).cards ?? DEFAULT_PROMOS)
      : DEFAULT_PROMOS;
    return <PromoGrid key="promos" cards={cards} />;
  })();

  const megaBazar = (() => {
    const block = bySlot.get(SECTION_SLOTS.megaBazar);
    if (block && !block.isActive) return null;
    const cfg = (block?.config ?? {}) as unknown as HomepageCampaignPanelConfig;
    return (
      <CampaignPanel
        key="mega_bazar"
        id="mega-sale"
        title={block?.title ?? "Mega Bazar"}
        subtitle={cfg.subtitle ?? "Deals of the month"}
        couponCode={cfg.couponCode}
        ctaHref={cfg.ctaHref}
        products={resolveProducts(
          cfg.source ?? "bestsellers",
          cfg.productIds,
          cfg.limit ?? 8,
          feeds,
          manual,
        )}
      />
    );
  })();

  return (
    <>
      {usp}
      {categories}
      {productRail(SECTION_SLOTS.bestSellers, {
        title: "Best sellers this week",
        subtitle: "Most ordered across Bangladesh",
        source: "bestsellers",
        // Desktop shows a 5-visible auto carousel over the whole list; the
        // mobile grid caps itself at 6 (2×3) inside ProductRail.
        limit: 15,
        carousel: true,
        linkLabel: "View all",
        linkHref: "/shop?sort=best_selling",
      })}
      {productRail(SECTION_SLOTS.newArrivals, {
        title: "New arrivals",
        subtitle: "Fresh from local stores",
        source: "newest",
        limit: 15,
        carousel: true,
        linkLabel: "View all",
        linkHref: "/shop?sort=newest",
      })}
      {promos}
      {megaBazar}
      {productRail(SECTION_SLOTS.recommended, {
        title: "Recommended for you",
        subtitle: "Picked for shoppers like you",
        source: "recommendations",
        limit: 10,
        linkLabel: "View all",
        linkHref: "/shop",
      })}
    </>
  );
}
