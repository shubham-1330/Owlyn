import { Banknote, ShieldCheck, Truck, Undo2 } from "lucide-react";

import { CONTAINER, GUTTER } from "@/lib/layout";
import { formatINR } from "@/lib/money";
import type { StoreConfig } from "@/lib/queries/settings";
import { cn } from "@/lib/utils";

export function TrustStrip({ config }: { config: StoreConfig }) {
  const items = [
    {
      icon: Undo2,
      title: `${config.returnsWindowDays}-day returns`,
      text: "Unworn, with tags. Size exchanges are free.",
    },
    {
      icon: Truck,
      title: `Free shipping over ${formatINR(config.freeShippingThreshold)}`,
      text: "Metro cities in 2 to 4 days, the rest of India in 4 to 7.",
    },
    {
      icon: ShieldCheck,
      title: "Secure payments",
      text: "UPI, cards, net banking and wallets through Razorpay.",
    },
    {
      icon: Banknote,
      title: "Cash on delivery",
      text: `Available on orders up to ${formatINR(config.codLimit)}.`,
    },
  ];

  return (
    <section className="py-12 md:py-16" aria-label="Shopping with Owlyn">
      <ul className={cn(CONTAINER, GUTTER, "grid gap-8 sm:grid-cols-2 lg:grid-cols-4")}>
        {items.map((item) => (
          <li key={item.title} className="flex gap-4">
            <item.icon className="mt-0.5 size-5 shrink-0 text-talon" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
