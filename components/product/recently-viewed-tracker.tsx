"use client";

import * as React from "react";
import { trackProductView } from "@/lib/api/engagement";

export interface RecentlyViewedTrackerProps {
  productId: string;
}

/**
 * Invisible side-effect component: pings the "recently viewed" endpoint once
 * on mount for the current product. Best-effort (errors are swallowed by
 * `trackProductView`), so it renders nothing.
 */
export function RecentlyViewedTracker({
  productId,
}: RecentlyViewedTrackerProps) {
  React.useEffect(() => {
    if (!productId) return;
    trackProductView(productId);
  }, [productId]);

  return null;
}
