import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { WishlistPageView } from "@/components/storefront/wishlist/wishlist-page-view";
import { getSessionUser } from "@/lib/auth/guards";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false },
};

/** Guest wishlist, kept in the browser. Signed-in users go to their account wishlist. */
export default async function GuestWishlistPage() {
  const user = await getSessionUser();
  if (user) redirect("/account/wishlist");

  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-10 md:py-14")}>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl">Wishlist</h1>
        <p className="measure text-muted-foreground">
          Saved on this device.{" "}
          <Link
            href="/login?next=%2Faccount%2Fwishlist"
            className="underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </Link>{" "}
          to keep it across devices.
        </p>
      </div>
      <WishlistPageView initial={null} />
    </div>
  );
}
