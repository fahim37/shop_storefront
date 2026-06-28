import { SectionHeader } from "@/components/layout/section-header";
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
}

export function ProductRail({
  title,
  products,
  subtitle,
  linkLabel,
  linkHref,
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
      <ProductGrid products={products} />
    </section>
  );
}
