import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

/**
 * Browse → add to bag → checkout → order placed, with stock checked in the
 * database afterwards. Cash on delivery runs everywhere. The Razorpay leg
 * needs test-mode keys and a webhook secret in the environment; without
 * them it is skipped, not faked.
 */

const db = new PrismaClient();
const PRODUCT_SLUG = "hush-court-1";

test.afterAll(async () => {
  await db.$disconnect();
});

/** Stock of every variant of the product, keyed by variant id, so the test can check whichever one the PDP picked. */
async function stockSnapshot(): Promise<Map<string, number>> {
  const product = await db.product.findUniqueOrThrow({
    where: { slug: PRODUCT_SLUG },
    select: { variants: { select: { id: true, stock: true } } },
  });
  return new Map(product.variants.map((v) => [v.id, v.stock]));
}

async function addToBagAndOpenCheckout(page: Page) {
  await page.goto(`/products/${PRODUCT_SLUG}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // First size that is not sold out. Colour swatches also use aria-pressed, so
  // scope to the fieldset whose legend says "Size"; sold-out sizes say so in their label.
  const sizeGroup = page.locator("fieldset").filter({ hasText: /^Size/ });
  const size = sizeGroup.locator('button[aria-pressed]:not([aria-label$=", sold out"])').first();
  if (await size.count()) await size.click();
  await expect(page.getByRole("button", { name: "Add to bag" }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Add to bag" }).first().click();
  const drawer = page.getByRole("dialog", { name: "Your bag" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
}

async function fillAddress(page: Page, email: string, pincode: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Full name").fill("Playwright Buyer");
  await page.getByLabel("Mobile number").fill("9876501234");
  await page.getByLabel("Pincode").fill(pincode);
  await expect(page.getByLabel("City")).not.toHaveValue("");
  await page.getByLabel("Flat, building, street").fill("12, 4th Cross, HSR Layout");
  await page.getByRole("button", { name: "Continue to shipping" }).click();
}

test("guest buys with cash on delivery and stock is decremented", async ({ page }) => {
  const before = await stockSnapshot();
  const email = `e2e-${Date.now()}@example.com`;

  await addToBagAndOpenCheckout(page);
  await fillAddress(page, email, "560034");

  await expect(page.getByRole("radio", { name: /Standard|Express/ }).first()).toBeVisible();
  await expect(
    page.getByText(/Free on bags over|Free over|Charged per order|brought the bag under/).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to payment" }).click();

  await page.getByRole("radio", { name: "Cash on delivery" }).check();
  await page.getByRole("button", { name: /Place order/ }).click();

  await expect(page).toHaveURL(/\/checkout\/success\//, { timeout: 30_000 });
  await expect(page.getByText("It is yours.")).toBeVisible();
  const orderNumber = (
    await page
      .getByText(/OWL-\d{4}-\d{6}/)
      .first()
      .textContent()
  )?.match(/OWL-\d{4}-\d{6}/)?.[0];
  expect(orderNumber).toBeTruthy();

  const order = await db.order.findUniqueOrThrow({
    where: { orderNumber: orderNumber! },
    include: { items: true, payments: true },
  });
  expect(order.status).toBe("CONFIRMED");
  expect(order.paymentMethod).toBe("COD");
  expect(order.payments[0]?.provider).toBe("COD");
  const variantId = order.items[0]!.variantId!;
  const after = await db.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { stock: true },
  });
  expect(after.stock).toBe(before.get(variantId)! - 1);
  expect(await db.inventoryLog.count({ where: { refId: order.id, reason: "SALE" } })).toBe(
    order.items.length,
  );

  // Invoice downloads for the purchasing session.
  const invoice = await page.request.get(
    `/api/invoices/${order.id}?t=${new URL(page.url()).searchParams.get("t")}`,
  );
  expect(invoice.status()).toBe(200);
  expect(invoice.headers()["content-type"]).toContain("application/pdf");

  // A stranger with the wrong token gets a 404.
  const stranger = await page.request.get(`/api/invoices/${order.id}?t=bad`);
  expect(stranger.status()).toBe(404);

  // Header bag count is back to zero: the bag was cleared when the order confirmed.
  await expect(page.getByRole("button", { name: "Bag, 0 items" })).toBeVisible();

  await db.inventoryLog.deleteMany({ where: { refId: order.id } });
  await db.order.delete({ where: { id: order.id } });
  await db.productVariant.update({
    where: { id: variantId },
    data: { stock: before.get(variantId)! },
  });
});

test("prepaid order reaches PAID through the webhook alone", async ({ page }) => {
  test.skip(
    !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET ||
      !process.env.RAZORPAY_WEBHOOK_SECRET,
    "Razorpay test keys are not configured",
  );
  const before = await stockSnapshot();
  const email = `e2e-${Date.now()}@example.com`;

  await addToBagAndOpenCheckout(page);
  await fillAddress(page, email, "560034");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("radio", { name: "Pay now" }).check();
  await page.getByRole("button", { name: /^Pay ₹/ }).click();

  // Razorpay's modal opens in an iframe; the shopper "closes the tab" here.
  await expect(page.frameLocator("iframe.razorpay-checkout-frame").locator("body")).toBeVisible({
    timeout: 30_000,
  });
  const order = await db.order.findFirstOrThrow({ where: { email }, include: { payments: true } });
  expect(order.status).toBe("PENDING");
  const rzpOrderId = order.payments[0]!.providerOrderId!;

  // The webhook arrives on its own and completes the order.
  const body = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_e2e_${Date.now()}`,
          order_id: rzpOrderId,
          amount: order.grandTotal,
          method: "upi",
        },
      },
    },
  });
  const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");
  const res = await page.request.post("/api/webhooks/razorpay", {
    data: body,
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": signature,
      "x-razorpay-event-id": `evt_e2e_${Date.now()}`,
    },
  });
  expect(res.status()).toBe(200);

  const paid = await db.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true },
  });
  expect(paid.status).toBe("CONFIRMED");
  expect(paid.paymentStatus).toBe("PAID");
  const variantId = paid.items[0]!.variantId!;
  const after = await db.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { stock: true },
  });
  expect(after.stock).toBe(before.get(variantId)! - 1);

  await db.inventoryLog.deleteMany({ where: { refId: order.id } });
  await db.order.delete({ where: { id: order.id } });
  await db.productVariant.update({
    where: { id: variantId },
    data: { stock: before.get(variantId)! },
  });
});
