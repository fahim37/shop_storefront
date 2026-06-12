"use client";

import * as React from "react";
import { ApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";

/** Extract a user-facing message from an unknown thrown value. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export interface FormErrorProps {
  /** Message to show; nothing is rendered when empty/undefined. */
  message?: string | null;
  className?: string;
}

/** Form-level (non-field) error banner. */
export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className,
      )}
    >
      {message}
    </p>
  );
}
