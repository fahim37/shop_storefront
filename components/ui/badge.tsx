import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap leading-none",
  {
    variants: {
      variant: {
        primary: "bg-blue-soft text-primary",
        accent: "bg-amber text-blue-deep",
        navy: "bg-navy text-white",
        success: "bg-green-soft text-[oklch(0.42_0.1_160)]",
        sale: "bg-red text-white",
        outline: "border border-border text-sub",
        muted: "bg-muted text-sub",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-1 text-[11px]",
        lg: "px-3 py-1.5 text-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { badgeVariants };
