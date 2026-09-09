"use client";

import { Heart } from "lucide-react";
import { useTransition } from "react";

import { useWishlist } from "@/components/storefront/wishlist/wishlist-provider";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  variantId = null,
  productName,
  size = "md",
  className,
}: {
  productId: string;
  variantId?: string | null;
  productName: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const wishlist = useWishlist();
  const saved = wishlist.has(productId);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        startTransition(async () => {
          await wishlist.toggle({ productId, variantId });
        });
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        size === "sm"
          ? "size-8 bg-ink/70 text-moon hover:bg-ink"
          : "size-12 border border-border hover:border-foreground",
        saved && "text-talon",
        className,
      )}
    >
      <Heart
        className={cn(size === "sm" ? "size-4" : "size-5")}
        fill={saved ? "currentColor" : "none"}
        aria-hidden
      />
    </button>
  );
}
