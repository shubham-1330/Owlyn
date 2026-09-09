"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCart } from "@/components/storefront/cart/cart-provider";

/**
 * Two small jobs after checkout: refresh the bag (the server emptied it
 * when the order confirmed, so the header count follows), and, while a
 * prepaid order is still waiting on the webhook, refresh the page every few
 * seconds until the payment window closes.
 */
export function SuccessLive({
  status,
  paymentStatus,
  paymentMethod,
  expiresAt,
}: {
  status: string;
  paymentStatus: string;
  paymentMethod: "RAZORPAY" | "COD" | null;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const cart = useCart();
  const refreshed = useRef(false);

  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    cart.refresh();
  }, [cart]);

  const waiting =
    status === "PENDING" && paymentStatus === "PENDING" && paymentMethod === "RAZORPAY";
  useEffect(() => {
    if (!waiting) return;
    const deadline = expiresAt ? new Date(expiresAt).getTime() : Date.now() + 20 * 60_000;
    const id = window.setInterval(() => {
      if (Date.now() > deadline + 60_000) {
        window.clearInterval(id);
        return;
      }
      router.refresh();
    }, 4000);
    return () => window.clearInterval(id);
  }, [waiting, expiresAt, router]);

  return null;
}
