"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/returns", label: "Returns" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/profile", label: "Profile" },
] as const;

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="lg:sticky lg:top-24">
      <ul className="-mx-5 no-scrollbar flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:px-0">
        {ITEMS.map((item) => {
          const exact = "exact" in item && item.exact;
          const active = exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-sm px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
