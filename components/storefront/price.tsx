import { discountPercent, formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  price,
  compareAtPrice,
  className,
  size = "sm",
}: {
  price: number;
  compareAtPrice?: number | null;
  className?: string;
  size?: "sm" | "lg";
}) {
  const percent = discountPercent(compareAtPrice, price);
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 num", className)}>
      <span
        className={cn(
          "font-medium",
          size === "lg" ? "display text-xl text-talon" : "text-foreground",
        )}
      >
        {formatINR(price)}
      </span>
      {percent > 0 && compareAtPrice ? (
        <>
          <span
            className={cn(
              "text-muted-foreground line-through",
              size === "lg" ? "text-base" : "text-xs",
            )}
          >
            {formatINR(compareAtPrice)}
          </span>
          <span className={cn("text-alert-2", size === "lg" ? "text-sm" : "text-xs")}>
            {percent}% off
          </span>
        </>
      ) : null}
    </span>
  );
}
