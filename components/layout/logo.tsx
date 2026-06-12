import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LogoProps {
  /** White wordmark for dark surfaces (footer, mobile header). */
  light?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

const MARK = {
  sm: "size-7 text-sm rounded-lg",
  md: "size-9 text-lg rounded-[10px]",
  lg: "size-10 text-xl rounded-[10px]",
} as const;

const WORD = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-[26px]",
} as const;

/** GCL wordmark — amber "G" mark on deep blue + Sora wordmark. */
export function Logo({ light, className, size = "md", href = "/" }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2.5 font-display font-extrabold tracking-tight",
        light ? "text-white" : "text-blue-deep",
        WORD[size],
        className,
      )}
      aria-label="GCL home"
    >
      <span
        className={cn(
          "flex items-center justify-center bg-blue-deep font-extrabold text-amber",
          MARK[size],
        )}
      >
        G
      </span>
      GCL
    </Link>
  );
}
