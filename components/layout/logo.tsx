import Link from "next/link";
import { cn } from "@/lib/utils";
import { LOGO_MEDIA_PATH } from "@/lib/config";
import { resolveMediaPath } from "@/lib/media";

export interface LogoProps {
  /** Rendered on a dark surface (footer, mobile header). */
  light?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

/** Source art is pre-trimmed to ~2:1, so height alone sets the scale. */
const IMG = {
  sm: "h-8",
  md: "h-11",
  lg: "h-12",
} as const;

/** GCL logo — blue + gold lettermark served from media storage (R2). */
export function Logo({ light, className, size = "md", href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("flex shrink-0 items-center", className)}
      aria-label="GCL home"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveMediaPath(LOGO_MEDIA_PATH)!}
        alt="GCL"
        decoding="async"
        className={cn(
          "w-auto",
          // The art ships on a white field; round it softly on dark surfaces
          // so the white plate reads as a badge rather than a stray box.
          light && "rounded-lg",
          IMG[size],
        )}
      />
    </Link>
  );
}
