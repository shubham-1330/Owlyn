import type { Metadata } from "next";

import { CheckoutView, type SavedAddress } from "@/components/storefront/checkout/checkout-view";
import { getSessionUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { getStoreConfig } from "@/lib/queries/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * One route, three steps. The bag itself comes from the CartProvider in the
 * storefront layout; this page only adds what checkout needs on top.
 */
export default async function CheckoutPage() {
  const [user, config] = await Promise.all([getSessionUser(), getStoreConfig()]);
  const [profile, addresses] = user
    ? await Promise.all([
        db.user.findUnique({
          where: { id: user.id },
          select: { email: true, name: true, phone: true },
        }),
        db.address.findMany({
          where: { userId: user.id },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        }),
      ])
    : [null, []];

  const saved: SavedAddress[] = addresses.map((a) => ({
    id: a.id,
    isDefault: a.isDefault,
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? "",
    landmark: a.landmark ?? "",
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    type: a.type,
  }));

  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-10 md:py-14")}>
      <h1 className="text-2xl md:text-3xl">Checkout</h1>
      <CheckoutView
        user={profile ? { email: profile.email, name: profile.name, phone: profile.phone } : null}
        savedAddresses={saved}
        razorpayEnabled={isRazorpayConfigured()}
        storeName={config.name}
        reservationMinutes={config.reservationMinutes}
      />
    </div>
  );
}
