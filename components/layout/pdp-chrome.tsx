"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn, isProductPath } from "@/lib/utils";

/**
 * Client shell for the sticky site header. On mobile product pages the global
 * header gives way to the PDP's floating top bar (Daraz-style immersive PDP),
 * so it hides itself below `md`. The class must live on the <header> element
 * itself — wrapping a sticky element in a plain div would cap its stickiness
 * to the wrapper's height.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-primary md:bg-card",
        isProductPath(pathname) && "max-md:hidden",
      )}
    >
      {children}
    </header>
  );
}

/**
 * Hides its children below `md` on product pages (used for the footer, which
 * the fixed PDP action bar would otherwise overlap at the end of the page).
 */
export function HideOnPdpMobile({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className={cn(isProductPath(pathname) && "max-md:hidden")}>
      {children}
    </div>
  );
}
