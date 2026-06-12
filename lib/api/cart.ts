"use client";

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk } from "@/lib/api/query-keys";
import { ApiError } from "@/lib/api/http";
import {
  cartSessionHeaders,
  clearCartSessionToken,
  getCartSessionToken,
} from "@/lib/cart/cart-session";
import { hasAccessToken } from "@/lib/auth/tokens";
import { useAuth } from "@/lib/auth/auth-context";
import { sumPaisa } from "@/lib/format";
import type { CartMergeResult, CartSnapshot } from "@/lib/api/types";

/** Headers for a cart request. Logged-in users rely on the Bearer token; guests
 *  send `X-Cart-Session` (minted on writes). */
function cartHeaders(write: boolean): Record<string, string> {
  if (hasAccessToken()) return {};
  return cartSessionHeaders(write);
}

/* ----------------------------------------------------------------------- */
/* Query                                                                   */
/* ----------------------------------------------------------------------- */

const EMPTY_CART: CartSnapshot = {
  cartId: "",
  currency: "BDT",
  items: [],
  savedForLater: [],
  vendorGroups: [],
  appliedCoupon: null,
  subtotalPaisa: "0",
  discountPaisa: "0",
  shippingTotalPaisa: "0",
  vatPaisa: "0",
  grandTotalPaisa: "0",
  expiresAt: "",
};

/**
 * The server-owned cart. Disabled for first-time guests (no token yet) so we
 * don't eagerly create a server cart on every visit — until they add an item.
 */
export function useCart() {
  const { status } = useAuth();
  const [hasToken, setHasToken] = React.useState(false);
  React.useEffect(() => {
    setHasToken(!!getCartSessionToken());
  }, [status]);

  const enabled = status === "authenticated" || hasToken;
  const query = useQuery({
    queryKey: qk.cart(),
    queryFn: () => http.get<CartSnapshot>("/cart", { headers: cartHeaders(false) }),
    enabled,
    staleTime: 10_000,
  });

  return {
    ...query,
    cart: query.data ?? EMPTY_CART,
  };
}

/** Total quantity across active cart lines (for the header badge). */
export function useCartCount(): number {
  const { cart } = useCart();
  return cart.items.reduce((n, l) => n + l.quantity, 0);
}

/* ----------------------------------------------------------------------- */
/* Mutations                                                               */
/* ----------------------------------------------------------------------- */

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { variantId: string; quantity?: number }) =>
      http.post<CartSnapshot>(
        "/cart/items",
        { variantId: vars.variantId, quantity: vars.quantity ?? 1 },
        { headers: cartHeaders(true) },
      ),
    onSuccess: (snapshot) => qc.setQueryData(qk.cart(), snapshot),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { itemId: string; quantity: number }) =>
      http.patch<CartSnapshot>(
        `/cart/items/${vars.itemId}`,
        { quantity: vars.quantity },
        { headers: cartHeaders(true) },
      ),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: qk.cart() });
      const prev = qc.getQueryData<CartSnapshot>(qk.cart());
      if (prev) qc.setQueryData(qk.cart(), optimisticQuantity(prev, vars.itemId, vars.quantity));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.cart(), ctx.prev);
    },
    onSuccess: (snapshot) => qc.setQueryData(qk.cart(), snapshot),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      http.delete<CartSnapshot>(`/cart/items/${itemId}`, {
        headers: cartHeaders(true),
      }),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: qk.cart() });
      const prev = qc.getQueryData<CartSnapshot>(qk.cart());
      if (prev) qc.setQueryData(qk.cart(), optimisticRemove(prev, itemId));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.cart(), ctx.prev);
    },
    onSuccess: (snapshot) => qc.setQueryData(qk.cart(), snapshot),
  });
}

export function useSaveForLater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      http.post<CartSnapshot & { moved: "wishlist" | "soft_flag" }>(
        `/cart/save-for-later/${itemId}`,
        undefined,
        { headers: cartHeaders(true) },
      ),
    onSuccess: (snapshot) => {
      qc.setQueryData(qk.cart(), snapshot);
      void qc.invalidateQueries({ queryKey: qk.wishlist() });
    },
  });
}

export function useApplyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (couponCode: string) =>
      http.post<CartSnapshot>(
        "/cart/coupon",
        { couponCode },
        { headers: cartHeaders(true) },
      ),
    onSuccess: (snapshot) => qc.setQueryData(qk.cart(), snapshot),
  });
}

export function useRemoveCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      http.delete<CartSnapshot>("/cart/coupon", { headers: cartHeaders(true) }),
    onSuccess: (snapshot) => qc.setQueryData(qk.cart(), snapshot),
  });
}

/* ----------------------------------------------------------------------- */
/* Merge guest cart into the user cart on login                            */
/* ----------------------------------------------------------------------- */

/**
 * Watches the auth lifecycle; when the user becomes authenticated and a guest
 * cart token exists, folds it into the user cart, clears the token, and
 * refreshes the cart. Mount once near the app root.
 */
export function useCartMergeOnAuth(): void {
  const { status } = useAuth();
  const qc = useQueryClient();
  const mergedRef = React.useRef(false);

  React.useEffect(() => {
    if (status !== "authenticated") {
      mergedRef.current = false;
      return;
    }
    if (mergedRef.current) return;
    const token = getCartSessionToken();
    mergedRef.current = true;
    if (!token) {
      void qc.invalidateQueries({ queryKey: qk.cart() });
      return;
    }
    http
      .post<CartMergeResult>("/cart/merge", { guestSessionToken: token })
      .then((res) => {
        clearCartSessionToken();
        qc.setQueryData(qk.cart(), res.cart);
      })
      .catch((err) => {
        // A stale/unknown guest token is harmless — just drop it.
        if (err instanceof ApiError) clearCartSessionToken();
        void qc.invalidateQueries({ queryKey: qk.cart() });
      });
  }, [status, qc]);
}

/* ----------------------------------------------------------------------- */
/* Optimistic helpers (recompute totals locally)                           */
/* ----------------------------------------------------------------------- */

function recompute(cart: CartSnapshot): CartSnapshot {
  const subtotal = sumPaisa(cart.items.map((l) => l.lineTotalPaisa));
  const rawDiscount = cart.appliedCoupon?.discountPaisa ?? "0";
  const discount =
    BigInt(rawDiscount) > BigInt(subtotal) ? subtotal : rawDiscount;
  const grand = (
    BigInt(subtotal) -
    BigInt(discount) +
    BigInt(cart.shippingTotalPaisa) +
    BigInt(cart.vatPaisa)
  ).toString();
  const vendorGroups = cart.vendorGroups.map((g) => {
    const items = cart.items.filter((l) => l.vendorId === g.vendorId);
    return {
      ...g,
      items,
      subtotalPaisa: sumPaisa(items.map((l) => l.lineTotalPaisa)),
    };
  });
  return {
    ...cart,
    subtotalPaisa: subtotal,
    discountPaisa: discount,
    grandTotalPaisa: grand,
    vendorGroups,
  };
}

function optimisticQuantity(
  cart: CartSnapshot,
  itemId: string,
  quantity: number,
): CartSnapshot {
  const items = cart.items.map((l) =>
    l.itemId === itemId
      ? {
          ...l,
          quantity,
          lineTotalPaisa: (BigInt(l.unitPricePaisa) * BigInt(quantity)).toString(),
        }
      : l,
  );
  return recompute({ ...cart, items });
}

function optimisticRemove(cart: CartSnapshot, itemId: string): CartSnapshot {
  const items = cart.items.filter((l) => l.itemId !== itemId);
  const vendorGroups = cart.vendorGroups
    .map((g) => ({ ...g, items: items.filter((l) => l.vendorId === g.vendorId) }))
    .filter((g) => g.items.length > 0);
  return recompute({ ...cart, items, vendorGroups });
}
