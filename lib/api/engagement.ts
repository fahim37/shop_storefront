"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-context";
import type { FollowedStore, WishlistItem } from "@/lib/api/types";

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
        vendorSlug: null,
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

/**
 * Best-effort "I viewed this product" ping (no error surfacing).
 *
 * `skipRefresh: true` is essential: this is a fire-and-forget background ping,
 * so a 401 must NOT run the http client's refresh+onUnauthorized path (which
 * pops the login modal). Without it, a logged-out — or expired — visitor gets
 * the auth modal thrown in their face just for opening a product page.
 */
export function trackProductView(productId: string): void {
  void http
    .post(`/me/recently-viewed/${productId}`, undefined, { skipRefresh: true })
    .catch(() => {});
}

/* ---- Followed stores ---- */

export function useFollowedStores() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.followedStores(),
    queryFn: () => http.get<FollowedStore[]>("/follow"),
    enabled: isAuthenticated,
  });
}

/**
 * Follow/unfollow toggle for a store, optimistic in both directions so the
 * store-page button flips instantly. Guests get the auth modal first.
 */
export function useToggleFollowStore(vendorId: string) {
  const qc = useQueryClient();
  const { requireAuth } = useAuth();
  const { data } = useFollowedStores();
  const isFollowing = (data ?? []).some((f) => f.vendorId === vendorId);

  const setLocal = (next: boolean) => {
    qc.setQueryData<FollowedStore[]>(qk.followedStores(), (prev) => {
      const list = prev ?? [];
      if (next) {
        if (list.some((f) => f.vendorId === vendorId)) return list;
        const optimistic: FollowedStore = {
          userId: "",
          vendorId,
          followedAt: new Date().toISOString(),
          notificationsEnabled: true,
          storeName: "",
          storeSlug: "",
          storeLogoUrl: null,
          ratingAverage: null,
        };
        return [...list, optimistic];
      }
      return list.filter((f) => f.vendorId !== vendorId);
    });
  };

  const follow = useMutation({
    mutationFn: () => http.post(`/follow/${vendorId}`, {}),
    onMutate: () => setLocal(true),
    onError: () => setLocal(false),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.followedStores() }),
  });
  const unfollow = useMutation({
    mutationFn: () => http.delete(`/follow/${vendorId}`),
    onMutate: () => setLocal(false),
    onError: () => setLocal(true),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.followedStores() }),
  });

  return {
    isFollowing,
    pending: follow.isPending || unfollow.isPending,
    toggle: () =>
      requireAuth(() => {
        if (isFollowing) unfollow.mutate();
        else follow.mutate();
      }),
  };
}
