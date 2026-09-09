import { describe, expect, it } from "vitest";
import { gstRateFor, inclusiveTax, splitGst } from "./tax";

describe("gstRateFor", () => {
  it("uses 5% for apparel and footwear at or under ₹2,500", () => {
    expect(gstRateFor("6109", 129_900)).toBe(5);
    expect(gstRateFor("64041190", 250_000)).toBe(5);
  });

  it("uses 18% above ₹2,500 and for bags", () => {
    expect(gstRateFor("6404", 549_900)).toBe(18);
    expect(gstRateFor("4202", 99_900)).toBe(18);
  });

  it("defaults to 18% for unknown codes", () => {
    expect(gstRateFor(null, 100)).toBe(18);
    expect(gstRateFor("9999", 100)).toBe(18);
  });
});

describe("inclusiveTax", () => {
  it("backs tax out of an inclusive total", () => {
    expect(inclusiveTax(118_000, 18)).toBe(18_000);
    expect(inclusiveTax(105_000, 5)).toBe(5_000);
    expect(inclusiveTax(0, 18)).toBe(0);
  });
});

describe("splitGst", () => {
  it("halves intra-state tax and keeps the odd paisa in SGST", () => {
    expect(splitGst(1_001, false)).toEqual({ cgst: 500, sgst: 501, igst: 0 });
  });

  it("puts everything in IGST for inter-state", () => {
    expect(splitGst(1_000, true)).toEqual({ cgst: 0, sgst: 0, igst: 1_000 });
  });
});
