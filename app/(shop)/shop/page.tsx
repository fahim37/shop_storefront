import * as React from "react";
import { ShopListing } from "@/components/shop/shop-listing";
import { ProductGridSkeleton } from "@/components/product/product-grid";
import { getProductsPage } from "@/lib/api/server";
import type { ProductCardRow } from "@/lib/api/types";

// Fallback only — product events revalidate the `products` cache tag on
// demand via /api/revalidate (see lib/api/server.ts).
export const revalidate = 3600;

export const metadata = {
  title: "Shop — GCL",
  description: "Browse the full GCL catalog: best sellers, new arrivals and more.",
};

export default async function ShopPage() {
  // Pre-fetch the DEFAULT first page (no filters/sort) so the grid paints
  // instantly on landing; ShopListing ignores the seed when URL filters are on.
  let firstPage: { data: ProductCardRow[] } | undefined;
  try {
    firstPage = await getProductsPage({ limit: 20 });
  } catch {
    firstPage = undefined; // client island fetches as before
  }

  return (
    <div className="wrap py-4">
      {/* useSearchParams (inside ShopListing) must sit under a Suspense boundary. */}
      <React.Suspense fallback={<ProductGridSkeleton count={10} cols={5} />}>
        <ShopListing initialPage={firstPage} />
      </React.Suspense>
    </div>
  );
}
