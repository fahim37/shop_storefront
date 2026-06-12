"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FieldProps {
  /** Stable id used to wire the label, control, and error message together. */
  id: string;
  label: string;
  /** Inline error text shown below the control. */
  error?: string;
  /** Optional helper/description text shown when there is no error. */
  description?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Form field wrapper: label + control + inline error/description.
 *
 * The control rendered as `children` should receive `id={id}`, and for full
 * a11y, `aria-invalid` + `aria-describedby={describedById}`. Helpers below are
 * exported so callers can derive those ids consistently.
 */
export function Field({
  id,
  label,
  error,
  description,
  className,
  children,
}: FieldProps) {
  const messageId = `${id}-message`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : description ? (
        <p id={messageId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Id for a field's message element (used with aria-describedby). */
export function fieldMessageId(id: string): string {
  return `${id}-message`;
}
