import { describe, expect, it } from "vitest";

import { buildTimeline, canCancel } from "./status";

const t = (s: string) => new Date(s);

describe("canCancel", () => {
  it("allows CONFIRMED and PACKED only", () => {
    expect(canCancel("CONFIRMED")).toBe(true);
    expect(canCancel("PACKED")).toBe(true);
    for (const s of [
      "PENDING",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
      "RETURN_REQUESTED",
      "RETURNED",
      "REFUNDED",
    ] as const) {
      expect(canCancel(s)).toBe(false);
    }
  });
});

describe("buildTimeline", () => {
  it("marks steps before the current status done, the current one current, the rest upcoming", () => {
    const tl = buildTimeline({
      status: "SHIPPED",
      placedAt: t("2026-09-10T08:00:00Z"),
      events: [
        { type: "STATUS", status: "CONFIRMED", createdAt: t("2026-09-10T08:00:00Z") },
        { type: "STATUS", status: "PACKED", createdAt: t("2026-09-10T12:00:00Z") },
        { type: "STATUS", status: "SHIPPED", createdAt: t("2026-09-11T09:00:00Z") },
        { type: "NOTE", status: null, createdAt: t("2026-09-11T09:30:00Z") },
      ],
    });
    expect(tl.steps.map((s) => s.state)).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect(tl.steps[1]!.at).toBe("2026-09-10T12:00:00.000Z");
    expect(tl.steps[3]!.at).toBeNull();
    expect(tl.terminal).toBeNull();
  });

  it("uses placedAt for Confirmed when no event recorded it", () => {
    const tl = buildTimeline({
      status: "CONFIRMED",
      placedAt: t("2026-09-10T08:00:00Z"),
      events: [],
    });
    expect(tl.steps[0]).toMatchObject({ state: "current", at: "2026-09-10T08:00:00.000Z" });
  });

  it("keeps every step done after delivery and adds the post-delivery status as terminal", () => {
    const tl = buildTimeline({
      status: "RETURN_REQUESTED",
      deliveredAt: t("2026-09-14T10:00:00Z"),
      events: [
        { type: "STATUS", status: "RETURN_REQUESTED", createdAt: t("2026-09-16T10:00:00Z") },
      ],
    });
    expect(tl.steps.every((s) => s.state === "done")).toBe(true);
    expect(tl.steps[4]!.at).toBe("2026-09-14T10:00:00.000Z");
    expect(tl.terminal).toEqual({
      status: "RETURN_REQUESTED",
      label: "Return requested",
      at: "2026-09-16T10:00:00.000Z",
    });
  });

  it("freezes a cancelled order at the last step it reached", () => {
    const tl = buildTimeline({
      status: "CANCELLED",
      cancelledAt: t("2026-09-10T15:00:00Z"),
      events: [
        { type: "STATUS", status: "CONFIRMED", createdAt: t("2026-09-10T08:00:00Z") },
        { type: "STATUS", status: "PACKED", createdAt: t("2026-09-10T12:00:00Z") },
        { type: "STATUS", status: "CANCELLED", createdAt: t("2026-09-10T15:00:00Z") },
      ],
    });
    expect(tl.steps.map((s) => s.state)).toEqual([
      "done",
      "done",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(tl.terminal).toEqual({
      status: "CANCELLED",
      label: "Cancelled",
      at: "2026-09-10T15:00:00.000Z",
    });
  });

  it("shows nothing reached while payment is pending", () => {
    const tl = buildTimeline({
      status: "PENDING",
      placedAt: t("2026-09-10T08:00:00Z"),
      events: [],
    });
    expect(tl.steps.every((s) => s.state === "upcoming")).toBe(true);
    expect(tl.steps[0]!.at).toBeNull();
  });
});
