import { cn } from "@/lib/utils";
import {
  ProductCard,
  ProductCardSkeleton,
  type CardProduct,
} from "@/components/product/product-card";

/** Responsive product grid (2 cols mobile → 5 desktop). */
export function ProductGrid({
  products,
  className,
  cols = 5,
  flushRows = false,
}: {
  products: CardProduct[];
  className?: string;
  cols?: 4 | 5;
  /**
   * Trim the incomplete final row at each breakpoint (see `.grid-flush-*` in
   * globals.css) so the grid always ends flush. For decorative rails only —
   * never for browse/search results, where every item must stay visible.
   */
  flushRows?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4",
        cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
        flushRows && (cols === 5 ? "grid-flush-5" : "grid-flush-4"),
        className,
      )}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({
  count = 5,
  cols = 5,
}: {
  count?: number;
  cols?: 4 | 5;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4",
        cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
