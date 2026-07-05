"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk } from "@/lib/api/query-keys";
import type {
  MyReview,
  Question,
  Review,
  ReviewListResponse,
  ReviewReplyMessage,
  ReviewSort,
} from "@/lib/api/types";

export const REVIEWS_PAGE_SIZE = 5;

/**
 * Paged PDP review list with sort + star filter. Each page carries the
 * (unfiltered) star distribution and total, so the summary histogram renders
 * from page 1. "View more" = `fetchNextPage()`.
 */
export function useInfiniteProductReviews(
  productId: string | undefined,
  opts: { sort: ReviewSort; rating?: number; pageSize?: number } = { sort: "recent" },
) {
  const pageSize = opts.pageSize ?? REVIEWS_PAGE_SIZE;
  return useInfiniteQuery({
    queryKey: qk.reviewsList(productId ?? "", { sort: opts.sort, rating: opts.rating }),
    queryFn: ({ pageParam }) =>
      http.get<ReviewListResponse>(`/products/${productId}/reviews`, {
        params: {
          limit: pageSize,
          offset: pageParam,
          sort: opts.sort,
          rating: opts.rating,
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.limit : undefined),
    enabled: !!productId,
  });
}

/**
 * The signed-in user's own reviews (any status), keyed by product + sub-order.
 * Used by the order detail page to show "Edit review" instead of a second
 * "Review" button once an item has been reviewed.
 */
export function useMyReviews(enabled = true) {
  return useQuery({
    queryKey: qk.myReviews(),
    queryFn: () => http.get<MyReview[]>("/reviews/mine"),
    enabled,
  });
}

export function useProductQuestions(productId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: qk.questions(productId ?? ""),
    queryFn: () =>
      http.get<Question[]>(`/products/${productId}/questions`, {
        params: { limit },
      }),
    enabled: !!productId,
  });
}

export interface SubmitReviewInput {
  productId: string;
  subOrderId: string;
  rating: number;
  title?: string;
  body?: string;
  recommend?: boolean;
  mediaIds?: string[];
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitReviewInput) =>
      http.post<Review>(`/products/${input.productId}/reviews`, input),
    onSuccess: (_r, input) => {
      void qc.invalidateQueries({ queryKey: qk.reviews(input.productId) });
      void qc.invalidateQueries({ queryKey: qk.myReviews() });
    },
  });
}

export interface UpdateReviewInput {
  reviewId: string;
  /** Only used to invalidate the product's review list after the edit. */
  productId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  recommend?: boolean | null;
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    // `productId` is only for cache invalidation; it isn't part of the PATCH body.
    mutationFn: (input: UpdateReviewInput) =>
      http.patch<Review>(`/reviews/${input.reviewId}`, {
        rating: input.rating,
        title: input.title,
        body: input.body,
        recommend: input.recommend,
      }),
    onSuccess: (_r, input) => {
      void qc.invalidateQueries({ queryKey: qk.reviews(input.productId) });
      void qc.invalidateQueries({ queryKey: qk.myReviews() });
    },
  });
}

/** Attach already-uploaded photos (media asset ids) to an existing review. */
export function useAttachReviewMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { reviewId: string; productId: string; mediaIds: string[] }) =>
      http.post(`/reviews/${vars.reviewId}/media`, { mediaIds: vars.mediaIds }),
    onSuccess: (_r, vars) => {
      void qc.invalidateQueries({ queryKey: qk.reviews(vars.productId) });
      void qc.invalidateQueries({ queryKey: qk.myReviews() });
    },
  });
}

/** Remove one photo (review_media id) from an existing review. */
export function useRemoveReviewMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { reviewId: string; productId: string; reviewMediaId: string }) =>
      http.delete(`/reviews/${vars.reviewId}/media/${vars.reviewMediaId}`),
    onSuccess: (_r, vars) => {
      void qc.invalidateQueries({ queryKey: qk.reviews(vars.productId) });
      void qc.invalidateQueries({ queryKey: qk.myReviews() });
    },
  });
}

export function useReviewHelpful(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { reviewId: string; isHelpful: boolean }) =>
      http.post<{ helpfulCount: number }>(`/reviews/${vars.reviewId}/helpful`, {
        isHelpful: vars.isHelpful,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reviews(productId) }),
  });
}

/**
 * Post the buyer's reply to the seller's response on their own review. Only
 * allowed once the seller has replied (the backend enforces this). Invalidates
 * the product's review list and the caller's "My reviews" list so the new
 * message shows in both places.
 */
export function useReplyToReview(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { reviewId: string; body: string }) =>
      http.post<ReviewReplyMessage>(`/reviews/${vars.reviewId}/replies`, {
        body: vars.body,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.reviews(productId) });
      void qc.invalidateQueries({ queryKey: qk.myReviews() });
    },
  });
}

export function useAskQuestion(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      http.post<Question>(`/products/${productId}/questions`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.questions(productId) }),
  });
}

export function useAnswerQuestion(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { questionId: string; body: string }) =>
      http.post(`/questions/${vars.questionId}/answers`, { body: vars.body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.questions(productId) }),
  });
}
