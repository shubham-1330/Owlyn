import { describe, expect, it } from "vitest";
import {
  assertPaise,
  discountPercent,
  formatINR,
  nonNegative,
  paiseToRupees,
  percentOf,
  rupeesToPaise,
  sumPaise,
} from "./money";

describe("formatINR", () => {
  it("formats whole rupees in Indian grouping without decimals", () => {
    expect(formatINR(449900)).toBe("₹4,499");
    expect(formatINR(123456700)).toBe("₹12,34,567");
    expect(formatINR(0)).toBe("₹0");
  });

  it("shows paise when the amount has a fraction or when asked", () => {
    expect(formatINR(449950)).toBe("₹4,499.50");
    expect(formatINR(449900, { showPaise: true })).toBe("₹4,499.00");
  });

  it("rejects non-integer input", () => {
    expect(() => formatINR(4499.5)).toThrow(TypeError);
    expect(() => formatINR(Number.NaN)).toThrow(TypeError);
  });
});

describe("conversions", () => {
  it("round-trips rupees and paise", () => {
    expect(rupeesToPaise(4499)).toBe(449900);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    expect(paiseToRupees(449900)).toBe(4499);
  });

  it("asserts safe integers", () => {
    expect(() => assertPaise(1.5)).toThrow();
    expect(() => assertPaise("100")).toThrow();
    expect(() => assertPaise(100)).not.toThrow();
  });
});

describe("arithmetic", () => {
  it("takes a percentage with paisa rounding", () => {
    expect(percentOf(10000, 12.5)).toBe(1250);
    expect(percentOf(333, 10)).toBe(33);
    expect(percentOf(335, 10)).toBe(34);
    expect(() => percentOf(100, -1)).toThrow(RangeError);
  });

  it("computes discount percent from MRP", () => {
    expect(discountPercent(599900, 449900)).toBe(25);
    expect(discountPercent(449900, 449900)).toBe(0);
    expect(discountPercent(null, 449900)).toBe(0);
    expect(discountPercent(100000, 120000)).toBe(0);
  });

  it("sums and clamps", () => {
    expect(sumPaise([100, 200, 300])).toBe(600);
    expect(sumPaise([])).toBe(0);
    expect(nonNegative(-500)).toBe(0);
    expect(nonNegative(500)).toBe(500);
  });
});
