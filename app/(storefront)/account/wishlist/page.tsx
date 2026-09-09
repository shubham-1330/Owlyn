import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/storefront/empty-state";
import { ProductCard } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { productCardSelect, toProductCard } from "@/lib/queries/products";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false },
};

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id, product: { deletedAt: null, status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, product: { select: productCardSelect } },
  });

  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-12 md:py-16")}>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl">Wishlist</h1>
        <p className="text-muted-foreground">
          {items.length === 0
            ? "Nothing saved yet."
            : `${items.length} ${items.length === 1 ? "item" : "items"} saved.`}
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="Save things for later."
          description="Tap the heart on any product and it will show up here."
          action={
            <Button asChild>
              <Link href="/">Back to the store</Link>
            </Button>
          }
          className="py-6"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id}>
              <ProductCard product={toProductCard(item.product)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
