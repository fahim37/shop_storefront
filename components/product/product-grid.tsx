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
}: {
  products: CardProduct[];
  className?: string;
  cols?: 4 | 5;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4",
        cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
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
