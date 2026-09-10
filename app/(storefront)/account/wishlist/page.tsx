import type { Metadata } from "next";

import { WishlistPageView } from "@/components/storefront/wishlist/wishlist-page-view";
import { requireUser } from "@/lib/auth/guards";
import { getWishlistProducts } from "@/lib/wishlist/service";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false },
};

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const items = await getWishlistProducts(user.id);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl">Wishlist</h1>
        <p className="text-muted-foreground">
          {items.length === 0
            ? "Nothing saved yet."
            : `${items.length} ${items.length === 1 ? "item" : "items"} saved to your account.`}
        </p>
      </header>
      <WishlistPageView initial={items} defaultEmail={user.email} />
    </>
  );
}
