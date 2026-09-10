import { vi } from "vitest";

// Load DATABASE_URL and AUTH_SECRET from .env (Node 22+).
try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional when the variables are already exported.
}

process.env.RAZORPAY_KEY_ID ??= "rzp_test_integration";
process.env.RAZORPAY_KEY_SECRET ??= "integration-key-secret";
process.env.RAZORPAY_WEBHOOK_SECRET ??= "integration-webhook-secret";
process.env.STORAGE_DIR ??= "./storage-test";

// No request scope here: cache tags are no-ops and unstable_cache is a pass-through.
vi.mock("next/cache", () => ({
  revalidateTag: () => undefined,
  revalidatePath: () => undefined,
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

// Talk to a fake gateway: order creation returns an id, nothing else is called.
vi.mock("@/lib/payments/razorpay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/razorpay")>();
  let n = 0;
  return {
    ...actual,
    createRazorpayOrder: async (input: { amountPaise: number }) => ({
      id: `order_it${Date.now().toString(36)}${(n++).toString(36)}`,
      amount: input.amountPaise,
      currency: "INR",
    }),
  };
});

// Emails and PDFs are covered by their own tests; keep the transaction tests quiet.
vi.mock("@/lib/orders/after", () => ({
  afterOrderConfirmed: async () => undefined,
  notifyOrderNeedsReview: async () => undefined,
  orderEmailData: async () => null,
  sendOrderCancelledEmail: async () => undefined,
  sendReturnRequestedEmail: async () => undefined,
}));
