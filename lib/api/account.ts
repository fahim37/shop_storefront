"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { http } from "@/lib/api/http";
import { qk } from "@/lib/api/query-keys";
import { useAuth } from "@/lib/auth/auth-context";
import type {
  Address,
  AddressInput,
  Me,
  Notification,
  NotificationPrefs,
  UploadedMedia,
  Wallet,
} from "@/lib/api/types";

/* ---- Profile ---- */

export function useMe() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.me(),
    queryFn: () => http.get<Me>("/me"),
    enabled: isAuthenticated,
  });
}

export interface ProfileUpdate {
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  photoUrl: string; // schema effectively requires it
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileUpdate) => http.patch("/me", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

/* ---- Addresses ---- */

export function useAddresses() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.addresses(),
    queryFn: () => http.get<Address[]>("/me/addresses"),
    enabled: isAuthenticated,
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddressInput) => http.post<Address>("/me/addresses", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses() }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; input: Partial<AddressInput> }) =>
      http.patch<Address>(`/me/addresses/${vars.id}`, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses() }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => http.delete(`/me/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses() }),
  });
}

export function useSetDefaultAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      http.post<{ id: string; isDefault: true }>(`/me/addresses/${id}/default`, undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.addresses() }),
  });
}

/* ---- Notifications ---- */

export function useNotifications(unreadOnly = false) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: qk.notifications(unreadOnly),
    initialPageParam: undefined as string | undefined,
    enabled: isAuthenticated,
    queryFn: ({ pageParam }) =>
      http.getList<Notification>("/me/notifications", {
        params: { limit: 20, cursor: pageParam, unreadOnly },
      }),
    getNextPageParam: (last) =>
      last.meta?.hasMore ? (last.meta.nextCursor ?? undefined) : undefined,
  });
}

export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.unreadCount(),
    queryFn: () => http.get<{ count: number }>("/me/notifications/unread-count"),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      http.post<Notification>(`/me/notifications/${id}/read`, undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: qk.unreadCount() });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      http.post<{ count: number }>("/me/notifications/read-all", undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: qk.unreadCount() });
    },
  });
}

export function useNotificationPrefs() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.notificationPrefs(),
    queryFn: () => http.get<NotificationPrefs>("/me/notification-preferences"),
    enabled: isAuthenticated,
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Omit<NotificationPrefs, "userId" | "createdAt" | "updatedAt">>) =>
      http.patch<NotificationPrefs>("/me/notification-preferences", input),
    onSuccess: (data) => qc.setQueryData(qk.notificationPrefs(), data),
  });
}

/* ---- Wallet ---- */

export function useWallet() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: qk.wallet(),
    queryFn: () => http.get<Wallet>("/wallet"),
    enabled: isAuthenticated,
  });
}

/* ---- Media upload (avatars, review photos) ---- */

export function useUploadMedia() {
  return useMutation({
    mutationFn: (vars: { file: File; ownerType: string; ownerId?: string }) => {
      const form = new FormData();
      form.append("file", vars.file);
      form.append("ownerType", vars.ownerType);
      if (vars.ownerId) form.append("ownerId", vars.ownerId);
      return http.post<UploadedMedia>("/me/media/upload", form);
    },
  });
}
