"use client";

import {
  ProductRail,
  type ProductRailProps,
} from "@/components/home/blocks/product-rail";
import { fromRecHit } from "@/lib/api/card";
import { useHomeRecommendations } from "@/lib/api/search";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Client wrapper around ProductRail for `recommendations`-sourced sections.
 *
 * The homepage is ISR-cached and its server-side recommendations fetch is
 * anonymous, so the server feed can never be personalized — it's a shared
 * fallback (popular items / bestsellers). Once a signed-in shopper hydrates,
 * this refetches /me/recommendations/home WITH auth and swaps in their picks;
 * guests just keep the server fallback with zero extra requests.
 */
export function RecommendedRail({
  products: fallback,
  limit,
  ...rest
}: ProductRailProps & { limit: number }) {
  const { isAuthenticated } = useAuth();
  const { data } = useHomeRecommendations({ enabled: isAuthenticated });
  const personalized = (data?.items ?? []).slice(0, limit).map(fromRecHit);

  return (
    <ProductRail
      {...rest}
      products={personalized.length > 0 ? personalized : fallback}
    />
  );
}
