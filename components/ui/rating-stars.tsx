import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RatingStarsProps {
  /** Rating 0–5 (number or numeric string). */
  value: number | string | null | undefined;
  size?: number;
  className?: string;
  /** Render partial fill on the active star (defaults to rounded). */
  precise?: boolean;
}

/** Five amber stars reflecting a 0–5 rating. */
export function RatingStars({
  value,
  size = 14,
  className,
  precise = false,
}: RatingStarsProps) {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  const rating = Number.isNaN(n) ? 0 : Math.max(0, Math.min(5, n));
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-amber-deep", className)}
      aria-label={`${rating.toFixed(1)} out of 5`}
      role="img"
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fillPct = precise
          ? Math.max(0, Math.min(1, rating - i)) * 100
          : rating >= i + 1
            ? 100
            : rating >= i + 0.5
              ? 50
              : 0;
        return (
          <span key={i} className="relative inline-flex" style={{ width: size, height: size }}>
            <Star size={size} className="absolute text-[oklch(0.88_0.01_258)]" strokeWidth={1.6} />
            {fillPct > 0 && (
              <span
                className="absolute overflow-hidden"
                style={{ width: `${fillPct}%`, height: size }}
              >
                <Star size={size} className="fill-amber-deep text-amber-deep" strokeWidth={1.6} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
