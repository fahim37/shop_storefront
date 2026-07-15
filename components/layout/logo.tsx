"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LOGO_MEDIA_PATH } from "@/lib/config";
import { resolveMediaPath } from "@/lib/media";

export interface LogoProps {
  /**
   * Rendered on a dark surface (footer, mobile header). Swaps to the
   * color-inverted mark (white letters + gold swoosh, transparent background)
   * so it reads on dark/blue instead of the blue-on-white original.
   */
  light?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  href?: string;
}

/** Source art is pre-trimmed to ~2:1, so height alone sets the scale. */
const IMG = {
  xs: "h-7",
  sm: "h-8",
  md: "h-11",
  lg: "h-12",
} as const;

/**
 * GCL logo — blue + gold lettermark served from media storage (R2). On dark
 * surfaces (`light`), a color-inverted variant (white + gold on transparent,
 * `public/logo-on-dark.png`) is used instead so the mark stays legible.
 *
 * Clicking it while already on its target page scrolls back to the top —
 * same-route navigations are otherwise a no-op in the App Router.
 */
export function Logo({ light, className, size = "md", href = "/" }: LogoProps) {
  const pathname = usePathname();
  const src = light ? "/logo-on-dark.png" : resolveMediaPath(LOGO_MEDIA_PATH)!;
  return (
    <Link
      href={href}
      onClick={() => {
        if (pathname === href) window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className={cn("flex shrink-0 items-center", className)}
      aria-label="GCL home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="GCL" decoding="async" className={cn("w-auto", IMG[size])} />
    </Link>
  );
}
