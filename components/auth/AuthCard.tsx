"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AuthCardProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  /** Optional footer area (e.g. switch-to-signup links). */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Centered auth card: bold heading, optional muted subtitle, content, and an
 * optional footer. Used standalone (full-page) and inside the auth modal. test
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <div className={cn("flex w-full flex-col gap-6", className)}>
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {children}
      {footer ? (
        <div className="text-center text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
