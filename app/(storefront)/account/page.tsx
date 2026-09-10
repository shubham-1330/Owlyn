import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/forms/field";
import { OrderList } from "@/components/storefront/account/order-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasRole, requireUser, STAFF_ROLES } from "@/lib/auth/guards";
import { getAccountSummary } from "@/lib/orders/queries";
import { RETURN_STATUS_LABEL } from "@/lib/returns/window";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const [{ welcome }, sessionUser] = await Promise.all([searchParams, requireUser("/account")]);
  const summary = await getAccountSummary(sessionUser.id);
  if (!summary) return null;

  const joined = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(summary.memberSince));

  return (
    <>
      <header className="flex flex-col gap-3">
        {welcome === "1" ? <FormMessage tone="success">Your account is ready.</FormMessage> : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl">{summary.name ?? "Your account"}</h1>
          {hasRole(sessionUser, STAFF_ROLES) ? (
            <Badge variant="brass">{sessionUser.role === "ADMIN" ? "Admin" : "Staff"}</Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground">
          {summary.email} · Member since {joined}.
        </p>
      </header>

      <section aria-labelledby="recent-orders" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 id="recent-orders" className="text-lg">
            Recent orders
          </h2>
          {summary.orderCount > 0 ? (
            <Link
              href="/account/orders"
              className="text-sm underline underline-offset-4 hover:text-primary"
            >
              All {summary.orderCount} {summary.orderCount === 1 ? "order" : "orders"}
            </Link>
          ) : null}
        </div>
        <OrderList
          orders={summary.recentOrders}
          empty={{
            title: "No orders yet.",
            description: "Your first order will show up here, with tracking and the invoice.",
          }}
        />
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="default-address" className="flex flex-col gap-3">
          <h2 id="default-address" className="text-lg">
            Default address
          </h2>
          {summary.defaultAddress ? (
            <address className="text-sm leading-relaxed text-muted-foreground not-italic">
              <span className="text-foreground">{summary.defaultAddress.fullName}</span>
              <br />
              {summary.defaultAddress.line1}
              {summary.defaultAddress.line2 ? `, ${summary.defaultAddress.line2}` : ""}
              <br />
              {summary.defaultAddress.city}, {summary.defaultAddress.state}{" "}
              {summary.defaultAddress.pincode}
              <br />
              <span className="num">{summary.defaultAddress.phone}</span>
            </address>
          ) : (
            <p className="text-sm text-muted-foreground">
              No address saved. Add one and checkout fills it in.
            </p>
          )}
          <Link
            href="/account/addresses"
            className="text-sm underline underline-offset-4 hover:text-primary"
          >
            Manage addresses
          </Link>
        </section>

        <section aria-labelledby="quick-links" className="flex flex-col gap-3">
          <h2 id="quick-links" className="text-lg">
            Wishlist and returns
          </h2>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/account/wishlist"
              className="text-foreground underline underline-offset-4 hover:text-primary"
            >
              {summary.wishlistCount} {summary.wishlistCount === 1 ? "item" : "items"} saved
            </Link>{" "}
            to your wishlist.
          </p>
          {summary.openReturns.length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm">
              {summary.openReturns.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span>
                    {r.type === "EXCHANGE" ? "Exchange" : "Return"} on{" "}
                    <span className="num">{r.orderNumber}</span>
                  </span>
                  <Badge variant="outline">{RETURN_STATUS_LABEL[r.status] ?? r.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No returns in progress.</p>
          )}
          <Link
            href="/account/returns"
            className="text-sm underline underline-offset-4 hover:text-primary"
          >
            All returns
          </Link>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:hidden">
        {hasRole(sessionUser, STAFF_ROLES) ? (
          <Button asChild variant="outline">
            <Link href="/admin">Open admin</Link>
          </Button>
        ) : null}
        <form action={signOutAction}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
      {hasRole(sessionUser, STAFF_ROLES) ? (
        <div className="hidden lg:block">
          <Button asChild variant="outline">
            <Link href="/admin">Open admin</Link>
          </Button>
        </div>
      ) : null}
    </>
  );
}
