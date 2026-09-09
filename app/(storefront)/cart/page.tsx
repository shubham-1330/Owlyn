import type { Metadata } from "next";

import { CartPageView } from "@/components/storefront/cart/cart-page-view";
import { ProductRail } from "@/components/storefront/product-rail";
import { getSessionUser } from "@/lib/auth/guards";
import { getVisitorToken } from "@/lib/cart/cookies";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false },
};

export default async function CartPage() {
  const [user, token] = await Promise.all([getSessionUser(), getVisitorToken()]);
  const recent = await getRecentlyViewed({ userId: user?.id ?? null, token });

  return (
    <>
      <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-10 md:py-14")}>
        <h1 className="text-2xl md:text-3xl">Your bag</h1>
        <CartPageView />
      </div>
      {recent.length > 0 ? (
        <ProductRail id="recently-viewed" title="Recently viewed" products={recent} />
      ) : null}
    </>
  );
}
