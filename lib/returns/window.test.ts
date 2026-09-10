import { describe, expect, it } from "vitest";

import { returnWindow, returnableQuantities } from "./window";

describe("returnWindow", () => {
  const deliveredAt = new Date("2026-09-10T10:00:00Z");

  it("is open inside the window and counts whole days left", () => {
    const w = returnWindow({ deliveredAt, windowDays: 7, now: new Date("2026-09-12T09:00:00Z") });
    expect(w.open).toBe(true);
    expect(w.closesAt.toISOString()).toBe("2026-09-17T10:00:00.000Z");
    expect(w.daysLeft).toBe(6);
  });

  it("closes exactly at the boundary", () => {
    expect(
      returnWindow({ deliveredAt, windowDays: 7, now: new Date("2026-09-17T09:59:59Z") }).open,
    ).toBe(true);
    const closed = returnWindow({
      deliveredAt,
      windowDays: 7,
      now: new Date("2026-09-17T10:00:00Z"),
    });
    expect(closed.open).toBe(false);
    expect(closed.daysLeft).toBe(0);
  });
});

describe("returnableQuantities", () => {
  const items = [
    { orderItemId: "a", qty: 2 },
    { orderItemId: "b", qty: 1 },
  ];

  it("subtracts units held by live return requests and ignores rejected ones", () => {
    const map = returnableQuantities(items, [
      { orderItemId: "a", qty: 1, requestStatus: "REQUESTED" },
      { orderItemId: "b", qty: 1, requestStatus: "REJECTED" },
    ]);
    expect(map.get("a")).toEqual({ ordered: 2, returned: 1, remaining: 1 });
    expect(map.get("b")).toEqual({ ordered: 1, returned: 0, remaining: 1 });
  });

  it("never goes below zero", () => {
    const map = returnableQuantities(items, [
      { orderItemId: "a", qty: 2, requestStatus: "COMPLETED" },
      { orderItemId: "a", qty: 1, requestStatus: "APPROVED" },
    ]);
    expect(map.get("a")!.remaining).toBe(0);
  });
});
