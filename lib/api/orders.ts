"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk } from "@/lib/api/query-keys";
import { uuid } from "@/lib/cart/cart-session";
import type {
  CheckoutResponse,
  OrderListItem,
  OrderTracking,
  OrderView,
  PaymentMethod,
} from "@/lib/api/types";

export function useOrders(params: { limit?: number; placedAfter?: string } = {}) {
  return useQuery({
    queryKey: qk.orders(params),
    queryFn: () =>
      http.get<OrderListItem[]>("/orders", {
        params: { limit: params.limit ?? 20, placedAfter: params.placedAfter },
      }),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: qk.order(id ?? ""),
    queryFn: () => http.get<OrderView>(`/orders/${id}`),
    enabled: !!id,
  });
}

export function useOrderTracking(id: string | undefined) {
  return useQuery({
    queryKey: qk.orderTracking(id ?? ""),
    queryFn: () => http.get<OrderTracking>(`/orders/${id}/tracking`),
    enabled: !!id,
    refetchInterval: 60_000, // shipment status moves; poll lightly
  });
}

export interface CheckoutInput {
  shippingAddressId: string;
  paymentMethod: PaymentMethod;
  customerNote?: string;
  perVendorNotes?: Record<string, string>;
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) =>
      http.post<CheckoutResponse>("/checkout", input, {
        headers: { "Idempotency-Key": uuid() },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.cart() });
      void qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason: string }) =>
      http.post<OrderView>(`/orders/${vars.id}/cancel`, { reason: vars.reason }),
    onSuccess: (order) => {
      qc.setQueryData(qk.order(order.id), order);
      void qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
