"use client";

import { Heart, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";

import { useCart } from "@/components/storefront/cart/cart-provider";
import { useWishlist } from "@/components/storefront/wishlist/wishlist-provider";
import { cn } from "@/lib/utils";

const iconButton =
  "relative inline-flex size-10 items-center justify-center rounded-sm transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span
      aria-hidden
      className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-xs bg-talon px-1 text-[10px] leading-none font-medium text-moon num"
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

export function HeaderActions({
  isSignedIn,
  onSearch,
}: {
  isSignedIn: boolean;
  onSearch: () => void;
}) {
  const cart = useCart();
  const wishlist = useWishlist();
  const bag = cart.view.itemCount;

  return (
    <div className="-mr-2 flex items-center">
      <button type="button" onClick={onSearch} aria-label="Search" className={iconButton}>
        <Search className="size-5" aria-hidden />
      </button>
      <Link
        href={isSignedIn ? "/account" : "/login"}
        aria-label={isSignedIn ? "Account" : "Sign in"}
        className={cn(iconButton, "hidden sm:inline-flex")}
      >
        <User className="size-5" aria-hidden />
      </Link>
      <Link
        href={wishlist.href}
        aria-label={`Wishlist, ${wishlist.count} ${wishlist.count === 1 ? "item" : "items"}`}
        className={cn(iconButton, "hidden sm:inline-flex")}
      >
        <Heart className="size-5" aria-hidden />
        <Count value={wishlist.count} />
      </Link>
      <button
        type="button"
        onClick={() => cart.setOpen(true)}
        aria-label={`Bag, ${bag} ${bag === 1 ? "item" : "items"}`}
        aria-haspopup="dialog"
        className={iconButton}
      >
        <ShoppingBag className="size-5" aria-hidden />
        <Count value={bag} />
      </button>
    </div>
  );
}
