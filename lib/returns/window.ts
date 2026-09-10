/**
 * Return and exchange rules, pure. The window is read from settings by the
 * caller and counted from the delivery date.
 */

export const RETURN_REASONS = [
  { code: "SIZE_SMALL", label: "Too small" },
  { code: "SIZE_LARGE", label: "Too large" },
  { code: "NOT_AS_DESCRIBED", label: "Not as described" },
  { code: "DAMAGED", label: "Arrived damaged" },
  { code: "WRONG_ITEM", label: "Wrong item sent" },
  { code: "QUALITY", label: "Quality not as expected" },
  { code: "CHANGED_MIND", label: "Changed my mind" },
] as const;

export type ReturnReasonCode = (typeof RETURN_REASONS)[number]["code"];

export const RETURN_REASON_CODES = RETURN_REASONS.map((r) => r.code) as [
  ReturnReasonCode,
  ...ReturnReasonCode[],
];

export function returnReasonLabel(code: string): string {
  return RETURN_REASONS.find((r) => r.code === code)?.label ?? code;
}

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Declined",
  PICKUP_SCHEDULED: "Pickup booked",
  RECEIVED: "Received",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export type ReturnWindow = {
  closesAt: Date;
  open: boolean;
  /** Whole days left, 0 when closed. */
  daysLeft: number;
};

const DAY_MS = 86_400_000;

/** Window runs `windowDays` full days from the delivery moment. */
export function returnWindow(input: {
  deliveredAt: Date;
  windowDays: number;
  now: Date;
}): ReturnWindow {
  const closesAt = new Date(input.deliveredAt.getTime() + input.windowDays * DAY_MS);
  const remaining = closesAt.getTime() - input.now.getTime();
  return {
    closesAt,
    open: remaining > 0,
    daysLeft: remaining > 0 ? Math.ceil(remaining / DAY_MS) : 0,
  };
}

export type ReturnableSummary = { ordered: number; returned: number; remaining: number };

/** Statuses of earlier return items that still hold their quantity. */
const HOLDING_STATUSES = new Set([
  "REQUESTED",
  "APPROVED",
  "PICKUP_SCHEDULED",
  "RECEIVED",
  "COMPLETED",
]);

/**
 * How many units of each order item may still be returned, given every
 * earlier return item on the order and the status of its request.
 */
export function returnableQuantities(
  items: ReadonlyArray<{ orderItemId: string; qty: number }>,
  existing: ReadonlyArray<{ orderItemId: string; qty: number; requestStatus: string }>,
): Map<string, ReturnableSummary> {
  const out = new Map<string, ReturnableSummary>();
  for (const item of items)
    out.set(item.orderItemId, { ordered: item.qty, returned: 0, remaining: item.qty });
  for (const prior of existing) {
    if (!HOLDING_STATUSES.has(prior.requestStatus)) continue;
    const row = out.get(prior.orderItemId);
    if (!row) continue;
    row.returned += prior.qty;
    row.remaining = Math.max(0, row.ordered - row.returned);
  }
  return out;
}
