"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk } from "@/lib/api/query-keys";
import type {
  RefundPreference,
  ReturnEligibility,
  ReturnListItem,
  ReturnReasonCode,
  ReturnRequest,
  ReturnView,
} from "@/lib/api/types";

/** The signed-in user's return requests, newest first. */
export function useMyReturns(enabled = true) {
  return useQuery({
    queryKey: qk.myReturns(),
    queryFn: () => http.get<ReturnListItem[]>("/me/returns"),
    enabled,
  });
}

export function useReturnDetail(id: string | undefined) {
  return useQuery({
    queryKey: qk.returnDetail(id ?? ""),
    queryFn: () => http.get<ReturnView>(`/me/returns/${id}`),
    enabled: !!id,
  });
}

/**
 * Return eligibility for each item of a delivered sub-order, keyed by
 * order-item id. One small GET per item (delivered sub-orders have a handful),
 * cached per item so reopening the order page doesn't refetch.
 */
export function useReturnEligibilities(
  orderId: string,
  orderItemIds: string[],
  enabled = true,
): Map<string, ReturnEligibility> {
  return useQueries({
    queries: orderItemIds.map((itemId) => ({
      queryKey: qk.returnEligibility(itemId),
      queryFn: async () => ({
        itemId,
        eligibility: await http.get<ReturnEligibility>(
          `/orders/${orderId}/items/${itemId}/return`,
        ),
      }),
      enabled: enabled && !!orderId,
      staleTime: 60_000,
    })),
    combine: (results) => {
      const map = new Map<string, ReturnEligibility>();
      for (const r of results) {
        if (r.data) map.set(r.data.itemId, r.data.eligibility);
      }
      return map;
    },
  });
}

export interface InitiateReturnInput {
  orderId: string;
  /** The order item whose "Return" action opened the flow — anchors the route. */
  primaryItemId: string;
  subOrderId: string;
  reasonCode: ReturnReasonCode;
  description?: string;
  /** Media-asset ids uploaded with ownerType "return_evidence". */
  photos?: string[];
  refundPreference: RefundPreference;
  items: Array<{ orderItemId: string; quantity: number }>;
}

export function useInitiateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, primaryItemId, ...body }: InitiateReturnInput) =>
      http.post<ReturnRequest>(
        `/orders/${orderId}/items/${primaryItemId}/return`,
        body,
      ),
    onSuccess: (_created, input) => {
      void qc.invalidateQueries({ queryKey: qk.myReturns() });
      // Each returned line now has an open return → its Return button flips
      // to "Return in progress".
      for (const it of input.items) {
        void qc.invalidateQueries({
          queryKey: qk.returnEligibility(it.orderItemId),
        });
      }
    },
  });
}
