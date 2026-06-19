"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-context";
import type {
  FollowedStore,
  RecentlyViewedItem,
  WishlistItem,
} from "@/lib/api/types";

/* ---- Wishlist ---- */

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.wishlist(),
    queryFn: () => http.get<WishlistItem[]>("/wishlist", { params: { limit: 100 } }),
    enabled: isAuthenticated,
  });
}

/** Set of wishlisted product ids for quick membership checks. */
export function useWishlistIds(): Set<string> {
  const { data } = useWishlist();
  return new Set((data ?? []).map((w) => w.productId));
}

/** Number of distinct products saved — drives the header badge. */
export function useWishlistCount(): number {
  return useWishlistIds().size;
}

export function useAddWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      http.post(`/wishlist/${productId}`, undefined),
    // Optimistic insert so the heart fills + the header count bumps instantly;
    // mirrors useRemoveWishlist's optimistic filter. The placeholder only needs
    // a productId for useWishlistIds()/useWishlistCount(); onSettled refetches
    // the authoritative row (title, thumbnail, price …).
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: qk.wishlist() });
      const prev = qc.getQueryData<WishlistItem[]>(qk.wishlist());
      const optimistic: WishlistItem = {
        userId: "",
        productId,
        addedAt: new Date().toISOString(),
        productTitle: "",
        productSlug: "",
        productStatus: "published",
        vendorId: "",
        thumbnailMediaId: null,
        minPricePaisa: null,
        brandName: null,
        vendorName: null,
      };
      qc.setQueryData<WishlistItem[]>(qk.wishlist(), (old) => {
        const list = old ?? [];
        return list.some((w) => w.productId === productId)
          ? list
          : [optimistic, ...list];
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.wishlist(), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.wishlist() }),
  });
}

export function useRemoveWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      http.delete<{ removed: boolean }>(`/wishlist/${productId}`),
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: qk.wishlist() });
      const prev = qc.getQueryData<WishlistItem[]>(qk.wishlist());
      if (prev)
        qc.setQueryData(
          qk.wishlist(),
          prev.filter((w) => w.productId !== productId),
        );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.wishlist(), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.wishlist() }),
  });
}

/** Toggle helper that opens auth if the user is logged out. */
export function useToggleWishlist() {
  const add = useAddWishlist();
  const remove = useRemoveWishlist();
  const { requireAuth } = useAuth();
  const ids = useWishlistIds();
  return {
    isWishlisted: (productId: string) => ids.has(productId),
    toggle: (productId: string) =>
      requireAuth(() => {
        if (ids.has(productId)) remove.mutate(productId);
        else add.mutate(productId);
      }),
    pending: add.isPending || remove.isPending,
  };
}

/* ---- Follow store ---- */

export function useFollows() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.follows(),
    queryFn: () => http.get<FollowedStore[]>("/follow"),
    enabled: isAuthenticated,
  });
}

export function useFollowStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { vendorId: string; notificationsEnabled?: boolean }) =>
      http.post(`/follow/store/${vars.vendorId}`, {
        notificationsEnabled: vars.notificationsEnabled ?? true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.follows() }),
  });
}

export function useUnfollowStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) =>
      http.delete<{ removed: boolean }>(`/follow/store/${vendorId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.follows() }),
  });
}

/* ---- Recently viewed ---- */

export function useRecentlyViewed(limit = 12) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.recentlyViewed(),
    queryFn: () =>
      http.get<RecentlyViewedItem[]>("/me/recently-viewed", { params: { limit } }),
    enabled: isAuthenticated,
  });
}

/** Best-effort "I viewed this product" ping (no error surfacing). */
export function trackProductView(productId: string): void {
  void http.post(`/me/recently-viewed/${productId}`, undefined).catch(() => {});
}
