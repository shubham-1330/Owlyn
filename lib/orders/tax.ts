import { splitGst } from "@/lib/tax";

/**
 * Place of supply for GST on a B2C shipment is the delivery state. When it
 * matches the state the store is registered in, tax is split CGST + SGST;
 * otherwise the whole amount is IGST.
 */

const ALIASES: Record<string, string> = {
  ka: "karnataka",
  mh: "maharashtra",
  dl: "delhi",
  "new delhi": "delhi",
  "nct of delhi": "delhi",
  tn: "tamil nadu",
  ts: "telangana",
  wb: "west bengal",
  up: "uttar pradesh",
  gj: "gujarat",
  rj: "rajasthan",
  kl: "kerala",
  hr: "haryana",
  pb: "punjab",
  mp: "madhya pradesh",
  ap: "andhra pradesh",
  or: "odisha",
  orissa: "odisha",
  br: "bihar",
  jk: "jammu and kashmir",
  "jammu & kashmir": "jammu and kashmir",
  as: "assam",
  ga: "goa",
};

export function normaliseState(value: string): string {
  const clean = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ALIASES[clean] ?? clean;
}

export type PlaceOfSupply = { state: string; isInterState: boolean };

export function placeOfSupply(shippingState: string, storeState: string): PlaceOfSupply {
  const state = normaliseState(shippingState);
  return { state: shippingState.trim(), isInterState: state !== normaliseState(storeState) };
}

export type OrderTaxSplit = { cgstTotal: number; sgstTotal: number; igstTotal: number };

export function orderTaxSplit(taxTotal: number, isInterState: boolean): OrderTaxSplit {
  const split = splitGst(taxTotal, isInterState);
  return { cgstTotal: split.cgst, sgstTotal: split.sgst, igstTotal: split.igst };
}

/** Per-line split for the invoice, so the printed halves add up line by line. */
export function lineTaxSplit(taxAmount: number, isInterState: boolean) {
  return splitGst(taxAmount, isInterState);
}
