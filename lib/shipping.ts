/**
 * Pure shipping helpers shared by checkout, the PDP delivery estimator and the seed.
 */

export type ZoneLike = {
  id: string;
  pincodePrefixes: string[];
  isDefault: boolean;
  isActive: boolean;
};

export function isValidPincode(value: string): boolean {
  return /^[1-9]\d{5}$/.test(value);
}

/**
 * Longest matching prefix wins. Falls back to the default zone, or null when
 * nothing matches (treat as unserviceable).
 */
export function findZoneForPincode<Z extends ZoneLike>(
  pincode: string,
  zones: readonly Z[],
): Z | null {
  if (!isValidPincode(pincode)) return null;
  let best: Z | null = null;
  let bestLength = 0;
  for (const zone of zones) {
    if (!zone.isActive) continue;
    for (const prefix of zone.pincodePrefixes) {
      if (prefix.length > bestLength && pincode.startsWith(prefix)) {
        best = zone;
        bestLength = prefix.length;
      }
    }
  }
  if (best) return best;
  return zones.find((zone) => zone.isActive && zone.isDefault) ?? null;
}

export type RateLike = {
  type: "FLAT" | "WEIGHT";
  baseRate: number;
  perKgRate: number | null;
  freeAbove: number | null;
};

/** Shipping charge in paise for a rate, given the order subtotal and total parcel weight. */
export function shippingCharge(rate: RateLike, subtotal: number, weightGrams: number): number {
  if (rate.freeAbove != null && subtotal >= rate.freeAbove) return 0;
  if (rate.type === "FLAT") return rate.baseRate;
  const extraKg = Math.max(0, Math.ceil(weightGrams / 1000) - 1);
  return rate.baseRate + extraKg * (rate.perKgRate ?? 0);
}
