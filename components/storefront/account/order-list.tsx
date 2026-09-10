import Image from "next/image";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { EmptyState } from "@/components/storefront/empty-state";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import type { OrderListItem } from "@/lib/orders/queries";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function OrderList({
  orders,
  empty,
}: {
  orders: OrderListItem[];
  empty: { title: string; description: string; action?: React.ReactNode };
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        title={empty.title}
        description={empty.description}
        action={
          empty.action ?? (
            <Button asChild>
              <Link href="/collections/new-in">Shop new in</Link>
            </Button>
          )
        }
        className="py-8"
      />
    );
  }
  return (
    <ul className="divide-y divide-border border-y border-border">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/account/orders/${order.id}`}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
          >
            <div className="flex -space-x-3">
              {order.preview.map((item, i) => (
                <div
                  key={i}
                  className="relative w-10 overflow-hidden border border-border bg-slate"
                  style={{ aspectRatio: "3 / 4" }}
                >
                  {item.image ? (
                    <Image src={item.image} alt="" fill sizes="40px" className="object-cover" />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-medium num">{order.orderNumber}</span>
              <span className="truncate text-sm text-muted-foreground">
                {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                {order.placedAt ? ` · ${DATE.format(new Date(order.placedAt))}` : ""}
                {order.deliveryWindow &&
                (order.status === "CONFIRMED" ||
                  order.status === "PACKED" ||
                  order.status === "SHIPPED")
                  ? ` · arrives ${order.deliveryWindow}`
                  : ""}
              </span>
            </div>
            <OrderStatusBadge status={order.status} className="justify-self-end" />
            <span className="hidden text-sm num sm:block">{formatINR(order.grandTotal)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
