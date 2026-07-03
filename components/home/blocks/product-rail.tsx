import { SectionHeader } from "@/components/layout/section-header";
import { ProductCarousel } from "@/components/home/blocks/product-carousel";
import { ProductGrid } from "@/components/product/product-grid";
import type { CardProduct } from "@/lib/api/card";

/* ----------------------------------------------------------------------------
 * Product rail — a titled section header + a grid of product cards. Backs the
 * admin `product_rail` and `curated_collection` blocks (Best sellers, New
 * arrivals, hand-picked collections). Server component; renders nothing with
 * no products so the homepage stays clean on an empty catalog.
 * ------------------------------------------------------------------------- */

export interface ProductRailProps {
  title: string;
  products: CardProduct[];
  subtitle?: string;
  linkLabel?: string;
  linkHref?: string;
  /**
   * Desktop renders a slow auto-sliding one-row carousel instead of a grid;
   * mobile/tablet keep the grid (capped at 6 so the section stays short).
   */
  carousel?: boolean;
}

export function ProductRail({
  title,
  products,
  subtitle,
  linkLabel,
  linkHref,
  carousel = false,
}: ProductRailProps) {
  if (products.length === 0) return null;
  return (
    <section className="wrap">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        linkLabel={linkLabel}
        linkHref={linkHref}
      />
      {carousel ? (
        <>
          <ProductGrid
            products={products.slice(0, 6)}
            flushRows
            className="lg:hidden"
          />
          <ProductCarousel products={products} className="hidden lg:block" />
        </>
      ) : (
        <ProductGrid products={products} flushRows />
      )}
    </section>
  );
}
