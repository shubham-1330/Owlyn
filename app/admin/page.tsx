import { db } from "@/lib/db";

export default async function AdminOverviewPage() {
  const [products, variants, lowStock, customers, orders, coupons] = await Promise.all([
    db.product.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    db.productVariant.count({ where: { isActive: true } }),
    db.productVariant.count({ where: { isActive: true, stock: { lte: 5 } } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.order.count(),
    db.coupon.count({ where: { isActive: true } }),
  ]);

  const tiles = [
    { label: "Active products", value: products },
    { label: "Variants", value: variants },
    { label: "Low or no stock", value: lowStock },
    { label: "Customers", value: customers },
    { label: "Orders", value: orders },
    { label: "Live coupons", value: coupons },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl">Overview</h1>
        <p className="text-muted-foreground">
          Live counts from the database. Revenue, funnels and tables arrive in Phase 7.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-1 border border-border bg-card p-5">
            <dt className="text-sm text-muted-foreground">{tile.label}</dt>
            <dd className="display text-2xl num">{tile.value.toLocaleString("en-IN")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
