"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk } from "@/lib/api/query-keys";
import type { Question, Review } from "@/lib/api/types";

export function useProductReviews(productId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: qk.reviews(productId ?? ""),
    queryFn: () =>
      http.get<{ reviews: Review[] }>(`/products/${productId}/reviews`, {
        params: { limit },
      }),
    enabled: !!productId,
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
    onSuccess: (_r, input) =>
      qc.invalidateQueries({ queryKey: qk.reviews(input.productId) }),
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
