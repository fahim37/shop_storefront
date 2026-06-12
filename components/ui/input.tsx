import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Text input styled with the muted fill + subtle border from the mockups. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[var(--radius)] border border-input bg-muted px-3.5 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
