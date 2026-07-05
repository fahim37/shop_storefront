import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned link. */
  linkLabel?: string;
  linkHref?: string;
  /** Extra inline node next to the title (e.g. a countdown chip). */
  extra?: React.ReactNode;
  className?: string;
}

/** Section heading: display-font title + subtitle on the left, "View all →" on the right. */
export function SectionHeader({
  title,
  subtitle,
  linkLabel,
  linkHref,
  extra,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-lg font-extrabold tracking-tight sm:text-2xl">
            {title}
          </h2>
          {extra}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-13 text-sub">{subtitle}</p>
        )}
      </div>
      {linkLabel && linkHref && (
        <Link
          href={linkHref}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-13 font-bold text-primary hover:text-primary-hover"
        >
          {linkLabel}
          <ArrowRight className="size-3.5" strokeWidth={2.4} />
        </Link>
      )}
    </div>
  );
}
