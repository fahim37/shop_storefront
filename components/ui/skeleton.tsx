import { cn } from "@/lib/utils";

/** Shimmering placeholder block. Uses the `.skeleton` shimmer from globals. */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-md", className)} {...props} />;
}
