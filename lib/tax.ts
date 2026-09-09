import { assertPaise, type Paise } from "@/lib/money";

/**
 * GST for Owlyn's catalogue, per the schedule in force from 22 September 2025.
 * Apparel, footwear and headgear are 5% at or under ₹2,500 per piece and 18%
 * above. Bags and anything unknown are 18%. Rates are whole percents.
 */

export const APPAREL_THRESHOLD_PAISE: Paise = 250_000;

const CHAPTER_RULES: Array<{ chapters: string[]; low: number; high: number }> = [
  { chapters: ["61", "62", "64", "65"], low: 5, high: 18 },
  { chapters: ["42"], low: 18, high: 18 },
];

export function gstRateFor(hsnCode: string | null | undefined, unitPrice: Paise): number {
  assertPaise(unitPrice, "unitPrice");
  const chapter = (hsnCode ?? "").slice(0, 2);
  const rule = CHAPTER_RULES.find((r) => r.chapters.includes(chapter));
  if (!rule) return 18;
  return unitPrice <= APPAREL_THRESHOLD_PAISE ? rule.low : rule.high;
}

/**
 * Tax contained in a tax-inclusive line total. Owlyn prices are MRP-style,
 * inclusive of GST, so tax is backed out rather than added on.
 */
export function inclusiveTax(lineTotal: Paise, ratePercent: number): Paise {
  assertPaise(lineTotal, "lineTotal");
  if (!Number.isInteger(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    throw new RangeError(`ratePercent must be a whole percent, received ${String(ratePercent)}`);
  }
  return Math.round((lineTotal * ratePercent) / (100 + ratePercent));
}

/** Split a tax amount into CGST/SGST halves for intra-state, or IGST for inter-state. */
export function splitGst(
  tax: Paise,
  interState: boolean,
): { cgst: Paise; sgst: Paise; igst: Paise } {
  assertPaise(tax, "tax");
  if (interState) return { cgst: 0, sgst: 0, igst: tax };
  const half = Math.floor(tax / 2);
  return { cgst: half, sgst: tax - half, igst: 0 };
}
