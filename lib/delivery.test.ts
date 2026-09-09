import { describe, expect, it } from "vitest";
import { estimateDeliveryWindow, formatDeliveryWindow } from "./delivery";

// 2026-09-09 is a Wednesday. 10:30 IST = 05:00 UTC.
const wedMorning = new Date("2026-09-09T05:00:00Z");
const wedEvening = new Date("2026-09-09T12:30:00Z"); // 18:00 IST
const satMorning = new Date("2026-09-12T05:00:00Z");

describe("estimateDeliveryWindow", () => {
  it("dispatches the same day before the cut-off", () => {
    const w = estimateDeliveryWindow({ now: wedMorning, cutoffHour: 14, minDays: 2, maxDays: 4 });
    expect(w.afterCutoff).toBe(false);
    expect(w.dispatch.toISOString().slice(0, 10)).toBe("2026-09-09");
    expect(w.earliest.toISOString().slice(0, 10)).toBe("2026-09-11");
    expect(w.latest.toISOString().slice(0, 10)).toBe("2026-09-14"); // skips Sunday the 13th
  });

  it("moves dispatch to the next day after the cut-off", () => {
    const w = estimateDeliveryWindow({ now: wedEvening, cutoffHour: 14, minDays: 1, maxDays: 2 });
    expect(w.afterCutoff).toBe(true);
    expect(w.dispatch.toISOString().slice(0, 10)).toBe("2026-09-10");
    expect(w.earliest.toISOString().slice(0, 10)).toBe("2026-09-11");
  });

  it("never dispatches or delivers on a Sunday", () => {
    const w = estimateDeliveryWindow({ now: satMorning, cutoffHour: 14, minDays: 1, maxDays: 1 });
    expect(w.dispatch.toISOString().slice(0, 10)).toBe("2026-09-12");
    expect(w.earliest.toISOString().slice(0, 10)).toBe("2026-09-14");
  });

  it("formats a range or a single day", () => {
    const w = estimateDeliveryWindow({ now: wedMorning, cutoffHour: 14, minDays: 2, maxDays: 4 });
    expect(formatDeliveryWindow(w)).toBe("Fri 11 Sept to Mon 14 Sept");
    const single = estimateDeliveryWindow({
      now: wedMorning,
      cutoffHour: 14,
      minDays: 2,
      maxDays: 2,
    });
    expect(formatDeliveryWindow(single)).toBe("Fri 11 Sept");
  });
});
