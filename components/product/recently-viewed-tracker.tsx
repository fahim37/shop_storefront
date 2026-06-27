"use client";

import * as React from "react";
import { trackProductView } from "@/lib/api/engagement";
import { useAuth } from "@/lib/auth/auth-context";

export interface RecentlyViewedTrackerProps {
  productId: string;
}

/**
 * Invisible side-effect component: pings the "recently viewed" endpoint once
 * on mount for the current product. Best-effort (errors are swallowed by
 * `trackProductView`), so it renders nothing.
 *
 * Recently-viewed is a per-user feature, so we only ping for authenticated
 * users — guests have no server-side list, and pinging as a guest would 401
 * (the endpoint requires auth) for no benefit.
 */
export function RecentlyViewedTracker({
  productId,
}: RecentlyViewedTrackerProps) {
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (!productId || !isAuthenticated) return;
    trackProductView(productId);
  }, [productId, isAuthenticated]);

  return null;
}
