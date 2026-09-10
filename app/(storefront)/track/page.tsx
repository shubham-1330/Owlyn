import type { Metadata } from "next";
import Link from "next/link";

import { TrackForm } from "@/components/storefront/track-form";
import { getSessionUser } from "@/lib/auth/guards";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Track an order",
  description:
    "Track an Owlyn order with the order number and the email or mobile number used at checkout.",
};

export default async function TrackPage() {
  const user = await getSessionUser();
  return (
    <div className={cn(CONTAINER, GUTTER, "flex max-w-3xl flex-col gap-8 py-10 md:py-14")}>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl">Track an order</h1>
        <p className="measure text-muted-foreground">
          Enter the order number from your confirmation email and the email or mobile number you
          used.
          {user ? (
            <>
              {" "}
              Signed in?{" "}
              <Link
                href="/account/orders"
                className="underline underline-offset-4 hover:text-primary"
              >
                Your orders are listed here
              </Link>
              .
            </>
          ) : null}
        </p>
      </header>
      <TrackForm />
    </div>
  );
}
