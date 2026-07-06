/**
 * Store-page `products` section. The page's Server Component resolves each
 * section's product source (newest / best-selling / manual pins) into
 * CardProduct[] and passes it down here — this component only lays it out.
 */
import * as React from "react";

import { cn } from "@/lib/utils";
import type { StoreProductsSection } from "@/lib/api/types";
import type { CardProduct } from "@/lib/api/card";
import { ProductCard } from "@/components/product/product-card";

export function ProductsBlock({
  section,
  products,
}: {
  section: StoreProductsSection;
  products: CardProduct[];
}) {
  if (products.length === 0) return null;
  return (
    <div>
      {section.title ? (
        <h3 className="text-2xl font-bold tracking-tight">{section.title}</h3>
      ) : null}
      {section.subtitle ? (
        <p className="mt-1 text-sm opacity-70">{section.subtitle}</p>
      ) : null}
      {section.layout === "carousel" ? (
        <div className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4">
          {products.map((p) => (
            <div key={p.id} className="w-40 shrink-0 snap-start sm:w-48">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={cn("mt-5 grid grid-cols-2 gap-3 sm:gap-4")}
          style={
            {
              gridTemplateColumns: "repeat(var(--cols), minmax(0, 1fr))",
              "--cols": 2,
            } as React.CSSProperties
          }
          id={`p-${section.id.replace(/[^a-zA-Z0-9_-]/g, "")}`}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      {section.layout === "grid" ? (
        <style>{`@media (min-width: 768px){ #p-${section.id.replace(/[^a-zA-Z0-9_-]/g, "")}{ --cols: ${section.columns} !important; } }`}</style>
      ) : null}
    </div>
  );
}
