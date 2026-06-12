"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Compact +/- quantity control clamped to [min, max]. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  loading = false,
  size = "md",
  className,
}: QuantityStepperProps) {
  const dec = () => value > min && onChange(value - 1);
  const inc = () => value < max && onChange(value + 1);
  const dim = size === "sm" ? "size-8 text-sm" : "h-11 w-10";
  const mid = size === "sm" ? "w-8 text-sm" : "w-12 text-sm";

  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-[10px] border border-border",
        disabled && "opacity-60",
        className,
      )}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled || loading || value <= min}
        aria-label="Decrease quantity"
        className={cn(
          "flex items-center justify-center bg-muted text-sub transition-colors hover:bg-blue-soft hover:text-primary disabled:opacity-40",
          dim,
        )}
      >
        <Minus className="size-4" strokeWidth={2.6} />
      </button>
      <span className={cn("text-center font-extrabold tabular-nums", mid)}>
        {loading ? <Spinner className="mx-auto size-4" /> : value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled || loading || value >= max}
        aria-label="Increase quantity"
        className={cn(
          "flex items-center justify-center bg-muted text-sub transition-colors hover:bg-blue-soft hover:text-primary disabled:opacity-40",
          dim,
        )}
      >
        <Plus className="size-4" strokeWidth={2.6} />
      </button>
    </div>
  );
}
