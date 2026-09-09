import type { Metadata } from "next";

import { WishlistPageView } from "@/components/storefront/wishlist/wishlist-page-view";
import { requireUser } from "@/lib/auth/guards";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { getWishlistProducts } from "@/lib/wishlist/service";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false },
};

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const items = await getWishlistProducts(user.id);

  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-10 md:py-14")}>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl">Wishlist</h1>
        <p className="text-muted-foreground">
          {items.length === 0
            ? "Nothing saved yet."
            : `${items.length} ${items.length === 1 ? "item" : "items"} saved to your account.`}
        </p>
      </div>
      <WishlistPageView initial={items} defaultEmail={user.email} />
    </div>
  );
}
