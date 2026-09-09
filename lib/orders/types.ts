/** Errors safe to show to the shopper. Anything else is a bug and propagates. */
export class OrderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "EMPTY"
      | "FORBIDDEN"
      | "UNSERVICEABLE"
      | "RATE"
      | "STOCK"
      | "COUPON"
      | "COD"
      | "RAZORPAY"
      | "TOTAL_CHANGED"
      | "UNAVAILABLE"
      | "NOT_FOUND"
      | "STATE" = "UNAVAILABLE",
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export type AddressSnapshot = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export function isAddressSnapshot(value: unknown): value is AddressSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return ["fullName", "phone", "line1", "city", "state", "pincode", "country"].every(
    (k) => typeof v[k] === "string",
  );
}
