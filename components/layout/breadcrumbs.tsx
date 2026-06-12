import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb trail. The last crumb renders as the current (bold) page. */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-faint",
        className,
      )}
    >
      <Link href="/" className="hover:text-primary">
        Home
      </Link>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={`${c.label}-${i}`}>
            <ChevronRight className="size-3.5 text-[oklch(0.8_0.01_255)]" strokeWidth={2.4} />
            {last || !c.href ? (
              <span className="font-bold text-ink">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-primary">
                {c.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
