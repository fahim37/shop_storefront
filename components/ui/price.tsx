import { cn } from "@/lib/utils";
import { discountPercent, formatPaisa } from "@/lib/format";

export interface PriceProps {
  /** Sale price in paisa (string). */
  pricePaisa: string | null | undefined;
  /** Optional original price for the strikethrough. */
  comparePaisa?: string | null;
  /** Show a "-NN%" / "Save ৳x" chip when discounted. */
  showSave?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-[22px] leading-none sm:text-[28px]",
} as const;

/** Brand price block: bold blue current price + strikethrough + optional save chip. */
export function Price({
  pricePaisa,
  comparePaisa,
  showSave = false,
  className,
  size = "md",
}: PriceProps) {
  const pct = discountPercent(pricePaisa, comparePaisa);
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <b className={cn("font-display font-extrabold tracking-tight text-primary", SIZES[size])}>
        {pricePaisa ? formatPaisa(pricePaisa) : "—"}
      </b>
      {comparePaisa && pct ? (
        <s className="text-sm font-medium text-faint">{formatPaisa(comparePaisa)}</s>
      ) : null}
      {showSave && pct ? (
        <span className="rounded-md bg-red px-1.5 py-0.5 text-[11px] font-extrabold text-white">
          -{pct}%
        </span>
      ) : null}
    </span>
  );
}
