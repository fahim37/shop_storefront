import * as React from "react";
import { ShopListing } from "@/components/shop/shop-listing";
import { ProductGridSkeleton } from "@/components/product/product-grid";

export const metadata = {
  title: "Shop — GCL",
  description: "Browse the full GCL catalog: best sellers, new arrivals and more.",
};

export default function ShopPage() {
  return (
    <div className="wrap py-4">
      {/* useSearchParams (inside ShopListing) must sit under a Suspense boundary. */}
      <React.Suspense fallback={<ProductGridSkeleton count={10} cols={5} />}>
        <ShopListing />
      </React.Suspense>
    </div>
  );
}
