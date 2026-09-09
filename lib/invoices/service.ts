import { db } from "@/lib/db";
import { renderInvoicePdf, type InvoiceData, type InvoiceLine } from "@/lib/invoices/render";
import { nextInvoiceNumber } from "@/lib/orders/order-number";
import { lineTaxSplit } from "@/lib/orders/tax";
import { isAddressSnapshot, type AddressSnapshot } from "@/lib/orders/types";
import { getStoreConfig } from "@/lib/queries/settings";
import { storage } from "@/lib/storage";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function addressLines(a: AddressSnapshot | null, fallbackPhone: string): string[] {
  if (!a) return ["-", fallbackPhone];
  return [
    a.fullName,
    a.line1,
    a.line2,
    a.landmark,
    `${a.city}, ${a.state} ${a.pincode}`,
    a.phone,
  ].filter((l): l is string => Boolean(l));
}

/** Builds invoice data from the order's snapshots only. Never reads live products. */
export async function buildInvoiceData(
  orderId: string,
  invoiceNumber: string,
): Promise<InvoiceData> {
  const [order, config] = await Promise.all([
    db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    }),
    getStoreConfig(),
  ]);
  const shipping = isAddressSnapshot(order.shippingAddress) ? order.shippingAddress : null;
  const billing = isAddressSnapshot(order.billingAddress) ? order.billingAddress : shipping;

  const lines: InvoiceLine[] = order.items.map((item) => {
    const net = item.lineTotal - item.discount;
    const split = lineTaxSplit(item.taxAmount, order.isInterState);
    return {
      name: item.name,
      variant: `${item.color} · ${item.size}`,
      sku: item.sku,
      hsnCode: item.hsnCode,
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: item.discount,
      taxableValue: net - item.taxAmount,
      taxRate: item.taxRate,
      cgst: split.cgst,
      sgst: split.sgst,
      igst: split.igst,
      lineTotal: net,
    };
  });

  return {
    invoiceNumber,
    invoiceDate: DATE.format(order.invoicedAt ?? new Date()),
    orderNumber: order.orderNumber,
    orderDate: DATE.format(order.placedAt ?? order.createdAt),
    seller: {
      legalName: config.legalName,
      gstin: config.gstin,
      address: [
        config.address.line1,
        config.address.line2,
        `${config.address.city}, ${config.address.state} ${config.address.pincode}`,
      ].filter(Boolean),
    },
    billTo: addressLines(billing, order.phone),
    shipTo: addressLines(shipping, order.phone),
    placeOfSupply: order.placeOfSupply ?? shipping?.state ?? "-",
    isInterState: order.isInterState,
    lines,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    taxableTotal: order.subtotal - order.discountTotal - order.taxTotal,
    cgstTotal: order.cgstTotal,
    sgstTotal: order.sgstTotal,
    igstTotal: order.igstTotal,
    taxTotal: order.taxTotal,
    shippingTotal: order.shippingTotal,
    grandTotal: order.grandTotal,
    paymentMethod: order.paymentMethod === "COD" ? "Cash on delivery" : "Online (Razorpay)",
    paymentStatus:
      order.paymentStatus === "PAID"
        ? "Paid"
        : order.paymentStatus === "PENDING"
          ? "Payable on delivery"
          : order.paymentStatus.toLowerCase().replace("_", " "),
  };
}

/**
 * Assigns an invoice number once (sequence, unique column), renders the PDF
 * and stores it. Re-entrant: a second call returns the stored file.
 */
export async function ensureInvoice(
  orderId: string,
): Promise<{ key: string; invoiceNumber: string }> {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      invoiceNumber: true,
      invoiceKey: true,
      status: true,
      paymentStatus: true,
    },
  });
  if (order.invoiceKey && order.invoiceNumber && (await storage().exists(order.invoiceKey))) {
    return { key: order.invoiceKey, invoiceNumber: order.invoiceNumber };
  }
  if (order.status === "PENDING" || order.status === "CANCELLED") {
    throw new Error("Invoices are issued for confirmed orders only.");
  }

  const invoiceNumber =
    order.invoiceNumber ??
    (await db.$transaction(async (tx) => {
      const current = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { invoiceNumber: true },
      });
      if (current.invoiceNumber) return current.invoiceNumber;
      const number = await nextInvoiceNumber(tx);
      await tx.order.update({
        where: { id: orderId },
        data: { invoiceNumber: number, invoicedAt: new Date() },
      });
      return number;
    }));

  const data = await buildInvoiceData(orderId, invoiceNumber);
  const pdf = await renderInvoicePdf(data);
  const key = `invoices/${order.orderNumber}.pdf`;
  await storage().put(key, pdf, "application/pdf");
  await db.order.update({ where: { id: orderId }, data: { invoiceKey: key } });
  return { key, invoiceNumber };
}

export async function getInvoiceFile(
  orderId: string,
): Promise<{ body: Buffer; filename: string } | null> {
  const { key, invoiceNumber } = await ensureInvoice(orderId);
  const file = await storage().get(key);
  return file ? { body: file.body, filename: `${invoiceNumber}.pdf` } : null;
}
