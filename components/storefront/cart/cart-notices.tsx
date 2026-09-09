"use client";

import { useCart } from "@/components/storefront/cart/cart-provider";
import { cn } from "@/lib/utils";

/** Server notices (price changes, stock) plus the last action message. Announced politely. */
export function CartNotices({ className }: { className?: string }) {
  const cart = useCart();
  const notices = cart.view.notices;
  if (notices.length === 0 && !cart.message) return null;
  return (
    <div className={cn("flex flex-col gap-2 text-sm", className)} aria-live="polite">
      {cart.message ? (
        <p
          role={cart.message.tone === "error" ? "alert" : "status"}
          className={cn(
            "border px-3 py-2",
            cart.message.tone === "error"
              ? "border-alert/60 text-alert-2"
              : "border-border text-foreground",
          )}
        >
          {cart.message.text}
        </p>
      ) : null}
      {notices.map((notice) => (
        <p key={notice} className="border border-border px-3 py-2 text-muted-foreground">
          {notice}
        </p>
      ))}
    </div>
  );
}
