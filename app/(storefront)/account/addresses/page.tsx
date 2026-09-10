import type { Metadata } from "next";

import { AddressBook } from "@/components/storefront/account/address-book";
import { listAddresses } from "@/lib/account/addresses";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await listAddresses(user.id);
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl">Addresses</h1>
        <p className="text-muted-foreground">
          {addresses.length === 0
            ? "Where should we send things?"
            : `${addresses.length} saved. The default one is picked at checkout.`}
        </p>
      </header>
      <AddressBook initial={addresses} />
    </>
  );
}
