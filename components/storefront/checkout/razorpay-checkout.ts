"use client";

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let loading: Promise<boolean> | null = null;

/** Loads checkout.js once. Resolves false when the script cannot load (offline, blocked). */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      loading = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return loading;
}

export type OpenRazorpayInput = {
  keyId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  storeName: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
  notes: Record<string, string>;
};

export type RazorpayOutcome =
  | { status: "success"; response: RazorpaySuccessResponse }
  | { status: "dismissed" }
  | { status: "failed"; description: string }
  | { status: "unavailable" };

/** Opens the Razorpay modal and resolves with what the shopper did. */
export async function openRazorpay(input: OpenRazorpayInput): Promise<RazorpayOutcome> {
  const ready = await loadRazorpay();
  if (!ready || !window.Razorpay) return { status: "unavailable" };

  return new Promise<RazorpayOutcome>((resolve) => {
    let settled = false;
    const done = (outcome: RazorpayOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };
    const instance = new window.Razorpay!({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      order_id: input.razorpayOrderId,
      name: input.storeName,
      description: input.description,
      prefill: input.prefill,
      notes: input.notes,
      theme: { color: "#c79a4b", backdrop_color: "rgba(14, 17, 22, 0.8)" },
      retry: { enabled: true },
      handler: (response) => done({ status: "success", response }),
      modal: { ondismiss: () => done({ status: "dismissed" }), escape: true, confirm_close: true },
    });
    instance.on("payment.failed", (response) => {
      // Razorpay keeps its modal open for a retry; only report if it then closes.
      console.warn("Razorpay payment failed", response.error.code, response.error.description);
    });
    instance.open();
  });
}
