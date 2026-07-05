import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        /** Amber CTA (Buy now, primary marketplace action). */
        accent:
          "bg-accent text-accent-foreground hover:bg-accent-hover shadow-[0_8px_20px_-8px_oklch(0.8_0.15_78/0.7)]",
        /** Solid blue (Sign in, add to cart, save). */
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        /** Dark navy/deep-blue solid. */
        navy: "bg-blue-deep text-white hover:bg-navy",
        /** Blue outline ("ghost blue" in the mockups). */
        outline:
          "border-2 border-primary bg-transparent text-primary hover:bg-blue-soft",
        /** Neutral outline. */
        soft: "border border-border bg-card text-foreground hover:bg-muted",
        /** Bordered translucent on dark surfaces. */
        line: "border-2 border-white/40 bg-transparent text-white hover:bg-white/10",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        sm: "h-10 px-4 text-13",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-sm",
        xl: "h-[52px] px-7 text-15",
        icon: "size-11",
        "icon-sm": "size-9",
      },
      fullWidth: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", fullWidth: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  /** Render as the child element (e.g. a Next <Link>), Radix Slot-style. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      disabled,
      children,
      asChild = false,
      type,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        // Slot forwards props to its child; only set `type` for a real button.
        {...(asChild ? {} : { type: type ?? "button" })}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {/* When asChild, Slot requires a SINGLE element child — pass children
            through untouched (no spinner/boolean siblings). */}
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Spinner className="size-4" aria-hidden="true" />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
