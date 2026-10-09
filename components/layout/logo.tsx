"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export interface LogoProps {
  /**
   * Use a white mark and wordmark on dark surfaces.
   */
  light?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  href?: string;
}

const MARK_SIZE = {
  xs: "size-7",
  sm: "size-8",
  md: "size-11",
  lg: "size-12",
} as const;

const WORDMARK_SIZE = {
  xs: "text-[23px]",
  sm: "text-[27px]",
  md: "text-[34px]",
  lg: "text-[38px]",
} as const;

/**
 * Cartivo's cart-shaped C mark and typeset wordmark. Assets ship with the
 * storefront so the logo loads independently of backend media storage.
 *
 * Clicking it while already on its target page scrolls back to the top —
 * same-route navigations are otherwise a no-op in the App Router.
 */
export function Logo({ light, className, size = "md", href = "/" }: LogoProps) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      onClick={() => {
        if (pathname === href) window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className={cn("flex shrink-0 items-center gap-1.5", className)}
      aria-label={`${BRAND.name} home`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND.mark}
        alt=""
        width={256}
        height={256}
        decoding="async"
        className={cn(
          "object-contain",
          MARK_SIZE[size],
          light && "brightness-0 invert",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "font-display font-extrabold leading-none tracking-[-0.055em]",
          light ? "text-white" : "text-blue-deep",
          WORDMARK_SIZE[size],
        )}
      >
        {BRAND.name}
      </span>
    </Link>
  );
}
