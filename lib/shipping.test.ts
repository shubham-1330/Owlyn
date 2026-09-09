import { describe, expect, it } from "vitest";
import { findZoneForPincode, isValidPincode, shippingCharge } from "./shipping";

const zones = [
  { id: "metro", pincodePrefixes: ["56", "40", "11"], isDefault: false, isActive: true },
  { id: "remote", pincodePrefixes: ["19", "78", "744"], isDefault: false, isActive: true },
  { id: "rest", pincodePrefixes: [], isDefault: true, isActive: true },
  { id: "off", pincodePrefixes: ["5"], isDefault: false, isActive: false },
];

describe("findZoneForPincode", () => {
  it("picks the longest active prefix", () => {
    expect(findZoneForPincode("560001", zones)?.id).toBe("metro");
    expect(findZoneForPincode("744101", zones)?.id).toBe("remote");
  });

  it("falls back to the default zone", () => {
    expect(findZoneForPincode("380001", zones)?.id).toBe("rest");
  });

  it("rejects malformed pincodes", () => {
    expect(findZoneForPincode("0123", zones)).toBeNull();
    expect(isValidPincode("012345")).toBe(false);
    expect(isValidPincode("560001")).toBe(true);
  });
});

describe("shippingCharge", () => {
  it("is free above the threshold", () => {
    expect(
      shippingCharge(
        { type: "FLAT", baseRate: 9900, perKgRate: null, freeAbove: 199900 },
        250000,
        500,
      ),
    ).toBe(0);
  });

  it("charges the flat base rate below it", () => {
    expect(
      shippingCharge(
        { type: "FLAT", baseRate: 9900, perKgRate: null, freeAbove: 199900 },
        150000,
        500,
      ),
    ).toBe(9900);
  });

  it("adds per-kg beyond the first kilo for weight rates", () => {
    expect(
      shippingCharge(
        { type: "WEIGHT", baseRate: 9900, perKgRate: 4000, freeAbove: null },
        1000,
        2400,
      ),
    ).toBe(17900);
    expect(
      shippingCharge(
        { type: "WEIGHT", baseRate: 9900, perKgRate: 4000, freeAbove: null },
        1000,
        900,
      ),
    ).toBe(9900);
  });
});
