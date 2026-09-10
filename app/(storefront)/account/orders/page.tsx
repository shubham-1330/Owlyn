import type { Metadata } from "next";
import Link from "next/link";

import { OrderList } from "@/components/storefront/account/order-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/guards";
import { listOrdersForUser } from "@/lib/orders/queries";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { cn } from "@/lib/utils";
import { ORDER_LIST_STATUSES, ordersQuerySchema } from "@/lib/validations/account";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

const selectClass =
  "h-10 rounded-sm border border-input bg-transparent px-3 text-sm text-foreground outline-none hover:border-fog focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring";

function pageHref(query: { status?: string; q?: string }, page: number): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (page > 1) params.set("page", String(page));
  const s = params.toString();
  return `/account/orders${s ? `?${s}` : ""}`;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [raw, user] = await Promise.all([searchParams, requireUser("/account/orders")]);
  const query = ordersQuerySchema.parse({
    page: typeof raw.page === "string" ? raw.page : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    q: typeof raw.q === "string" ? raw.q : undefined,
  });
  const result = await listOrdersForUser(user.id, query);
  const filtered = Boolean(query.status || query.q);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl">Orders</h1>
        <p className="text-muted-foreground">
          {result.total === 0 && !filtered
            ? "Everything you order shows up here."
            : `${result.total} ${result.total === 1 ? "order" : "orders"}${filtered ? " match" : ""}.`}
        </p>
      </header>

      <form
        method="get"
        action="/account/orders"
        className="flex flex-wrap items-end gap-3"
        role="search"
        aria-label="Filter orders"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="orders-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="orders-status"
            name="status"
            defaultValue={query.status ?? ""}
            className={cn(selectClass, "min-w-44")}
          >
            <option value="">All statuses</option>
            {ORDER_LIST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="orders-q" className="text-sm font-medium">
            Order number
          </label>
          <Input
            id="orders-q"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="OWL-2026-000123"
            className="w-56"
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {filtered ? (
          <Button asChild variant="link" size="sm">
            <Link href="/account/orders">Clear</Link>
          </Button>
        ) : null}
      </form>

      <OrderList
        orders={result.orders}
        empty={
          filtered
            ? {
                title: "Nothing matches that filter.",
                description:
                  "Try another status, or check the order number against your confirmation email.",
                action: (
                  <Button asChild variant="outline">
                    <Link href="/account/orders">Show all orders</Link>
                  </Button>
                ),
              }
            : {
                title: "No orders yet.",
                description: "Your first order will show up here, with tracking and the invoice.",
              }
        }
      />

      {result.pages > 1 ? (
        <nav aria-label="Order pages" className="flex items-center justify-between text-sm">
          {result.page > 1 ? (
            <Link
              href={pageHref(query, result.page - 1)}
              className="underline underline-offset-4 hover:text-primary"
            >
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground num">
            Page {result.page} of {result.pages}
          </span>
          {result.page < result.pages ? (
            <Link
              href={pageHref(query, result.page + 1)}
              className="underline underline-offset-4 hover:text-primary"
            >
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
