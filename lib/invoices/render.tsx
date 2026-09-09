import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import * as React from "react";

/**
 * GST tax invoice. <!-- REVIEW WITH AN ACCOUNTANT --> The layout and the
 * fields follow the common B2C format (seller GSTIN, invoice number and
 * date, HSN per line, taxable value, rate, CGST/SGST or IGST, totals) but
 * an accountant should confirm it before it goes to customers.
 *
 * Money arrives in paise and is printed as INR with two decimals. Helvetica
 * has no rupee sign, so "INR" is used instead of the symbol.
 */

export type InvoiceLine = {
  name: string;
  variant: string;
  sku: string;
  hsnCode: string | null;
  qty: number;
  unitPrice: number;
  discount: number;
  taxableValue: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  orderDate: string;
  seller: { legalName: string; gstin: string; address: string[] };
  billTo: string[];
  shipTo: string[];
  placeOfSupply: string;
  isInterState: boolean;
  lines: InvoiceLine[];
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
};

export function inr(paise: number): string {
  return `INR ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#0e1116" },
  row: { flexDirection: "row" },
  headerTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  wordmark: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: -1 },
  muted: { color: "#5c636b" },
  block: { marginBottom: 12 },
  label: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  table: { marginTop: 10, borderTopWidth: 1, borderColor: "#0e1116" },
  th: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#0e1116",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
  },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#d3d6d2", paddingVertical: 4 },
  cName: { width: "34%" },
  cHsn: { width: "10%" },
  cQty: { width: "6%", textAlign: "right" },
  cUnit: { width: "12%", textAlign: "right" },
  cTaxable: { width: "12%", textAlign: "right" },
  cRate: { width: "7%", textAlign: "right" },
  cTax: { width: "9%", textAlign: "right" },
  cTotal: { width: "10%", textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: {
    borderTopWidth: 1,
    borderColor: "#0e1116",
    marginTop: 4,
    paddingTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7.5,
    color: "#5c636b",
  },
});

export function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  const inter = invoice.isInterState;
  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={invoice.seller.legalName}>
      <Page size="A4" style={styles.page}>
        <View style={[styles.row, { justifyContent: "space-between", marginBottom: 18 }]}>
          <View>
            <Text style={styles.wordmark}>owlyn</Text>
            <Text style={styles.muted}>{invoice.seller.legalName}</Text>
            {invoice.seller.address.map((line, i) => (
              <Text key={i} style={styles.muted}>
                {line}
              </Text>
            ))}
            <Text style={styles.muted}>
              GSTIN: {invoice.seller.gstin || "Pending registration"}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.headerTitle}>Tax invoice</Text>
            <Text>Invoice no. {invoice.invoiceNumber}</Text>
            <Text>Invoice date {invoice.invoiceDate}</Text>
            <Text>Order no. {invoice.orderNumber}</Text>
            <Text>Order date {invoice.orderDate}</Text>
          </View>
        </View>

        <View style={[styles.row, styles.block]}>
          <View style={{ width: "34%" }}>
            <Text style={styles.label}>Bill to</Text>
            {invoice.billTo.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </View>
          <View style={{ width: "34%" }}>
            <Text style={styles.label}>Ship to</Text>
            {invoice.shipTo.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </View>
          <View style={{ width: "32%" }}>
            <Text style={styles.label}>Place of supply</Text>
            <Text>{invoice.placeOfSupply}</Text>
            <Text style={styles.muted}>
              {inter ? "Inter-state supply: IGST" : "Intra-state supply: CGST + SGST"}
            </Text>
            <Text style={[styles.label, { marginTop: 6 }]}>Payment</Text>
            <Text>
              {invoice.paymentMethod} · {invoice.paymentStatus}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.cName}>Item</Text>
            <Text style={styles.cHsn}>HSN</Text>
            <Text style={styles.cQty}>Qty</Text>
            <Text style={styles.cUnit}>Unit price</Text>
            <Text style={styles.cTaxable}>Taxable</Text>
            <Text style={styles.cRate}>GST</Text>
            <Text style={styles.cTax}>{inter ? "IGST" : "CGST"}</Text>
            {inter ? null : <Text style={styles.cTax}>SGST</Text>}
            <Text style={styles.cTotal}>Total</Text>
          </View>
          {invoice.lines.map((line, i) => (
            <View key={i} style={styles.tr} wrap={false}>
              <View style={styles.cName}>
                <Text>{line.name}</Text>
                <Text style={styles.muted}>
                  {line.variant} · {line.sku}
                  {line.discount > 0 ? ` · discount ${inr(line.discount)}` : ""}
                </Text>
              </View>
              <Text style={styles.cHsn}>{line.hsnCode ?? "-"}</Text>
              <Text style={styles.cQty}>{line.qty}</Text>
              <Text style={styles.cUnit}>{inr(line.unitPrice)}</Text>
              <Text style={styles.cTaxable}>{inr(line.taxableValue)}</Text>
              <Text style={styles.cRate}>{line.taxRate}%</Text>
              <Text style={styles.cTax}>{inr(inter ? line.igst : line.cgst)}</Text>
              {inter ? null : <Text style={styles.cTax}>{inr(line.sgst)}</Text>}
              <Text style={styles.cTotal}>{inr(line.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal (incl. GST)</Text>
            <Text>{inr(invoice.subtotal)}</Text>
          </View>
          {invoice.discountTotal > 0 ? (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>-{inr(invoice.discountTotal)}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text>Taxable value</Text>
            <Text>{inr(invoice.taxableTotal)}</Text>
          </View>
          {inter ? (
            <View style={styles.totalRow}>
              <Text>IGST</Text>
              <Text>{inr(invoice.igstTotal)}</Text>
            </View>
          ) : (
            <>
              <View style={styles.totalRow}>
                <Text>CGST</Text>
                <Text>{inr(invoice.cgstTotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>SGST</Text>
                <Text>{inr(invoice.sgstTotal)}</Text>
              </View>
            </>
          )}
          <View style={styles.totalRow}>
            <Text>Shipping</Text>
            <Text>{invoice.shippingTotal === 0 ? "Free" : inr(invoice.shippingTotal)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grand]}>
            <Text>Total</Text>
            <Text>{inr(invoice.grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Prices are inclusive of GST. Taxable value is the price after discount, net of tax.
            Draft format: review with an accountant before use.
          </Text>
          <Text>This is a computer-generated invoice and does not need a signature.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
