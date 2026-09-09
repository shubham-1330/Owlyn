import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Five brass stars, filled to the nearest half. `value` is 0 to 5. */
export function RatingStars({
  value,
  className,
  size = "sm",
}: {
  value: number;
  className?: string;
  size?: "sm" | "md";
}) {
  const rounded = Math.round(value * 2) / 2;
  const dimension = size === "md" ? "size-5" : "size-3.5";
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rounded.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = rounded >= star ? 1 : rounded >= star - 0.5 ? 0.5 : 0;
        return (
          <span key={star} className={cn("relative", dimension)} aria-hidden>
            <Star
              className={cn("absolute inset-0 text-fog-2", dimension)}
              fill="currentColor"
              strokeWidth={0}
            />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("text-talon", dimension)} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
