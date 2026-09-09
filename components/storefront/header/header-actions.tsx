"use client";

import { Heart, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import type { HeaderCounts } from "@/lib/queries/counts";
import { cn } from "@/lib/utils";

const iconButton =
  "relative inline-flex size-10 items-center justify-center rounded-sm transition-colors hover:bg-moon/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span
      aria-hidden
      className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-xs bg-talon px-1 text-[10px] leading-none font-medium text-ink num"
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

export function HeaderActions({
  counts,
  isSignedIn,
  onSearch,
}: {
  counts: HeaderCounts;
  isSignedIn: boolean;
  onSearch: () => void;
}) {
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
        href="/account/wishlist"
        aria-label={`Wishlist, ${counts.wishlist} ${counts.wishlist === 1 ? "item" : "items"}`}
        className={cn(iconButton, "hidden sm:inline-flex")}
      >
        <Heart className="size-5" aria-hidden />
        <Count value={counts.wishlist} />
      </Link>
      <Link
        href="/cart"
        aria-label={`Bag, ${counts.bag} ${counts.bag === 1 ? "item" : "items"}`}
        className={iconButton}
      >
        <ShoppingBag className="size-5" aria-hidden />
        <Count value={counts.bag} />
      </Link>
    </div>
  );
}
