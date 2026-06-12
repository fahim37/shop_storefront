import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  /** Accessible label for screen readers. Defaults to "Loading". */
  label?: string;
}

/** Indeterminate loading spinner. */
export function Spinner({ className, label = "Loading", ...props }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("h-4 w-4 animate-spin", className)}
      {...props}
    />
  );
}
