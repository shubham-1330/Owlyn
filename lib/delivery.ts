/**
 * Delivery window maths. Pure and timezone-explicit so it can be unit tested
 * and reused by the PDP estimator, checkout and order emails.
 */

export const INDIA_TIME_ZONE = "Asia/Kolkata";

type LocalParts = { year: number; month: number; day: number; hour: number; weekday: number };

function localParts(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    weekday: weekdays.indexOf(get("weekday")),
  };
}

/** A calendar date in the store's timezone, held as UTC midnight so arithmetic is exact. */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function isSunday(date: Date): boolean {
  return date.getUTCDay() === 0;
}

export type DeliveryWindow = {
  /** Calendar date the parcel leaves the warehouse (UTC midnight of the local date). */
  dispatch: Date;
  earliest: Date;
  latest: Date;
  /** True when the order was placed after the cut-off and dispatch moved to the next working day. */
  afterCutoff: boolean;
};

export function estimateDeliveryWindow(input: {
  now: Date;
  cutoffHour: number;
  minDays: number;
  maxDays: number;
  timeZone?: string;
}): DeliveryWindow {
  const tz = input.timeZone ?? INDIA_TIME_ZONE;
  const local = localParts(input.now, tz);
  let dispatch = utcDate(local.year, local.month, local.day);
  const afterCutoff = local.hour >= input.cutoffHour;
  if (afterCutoff) dispatch = addDays(dispatch, 1);
  while (isSunday(dispatch)) dispatch = addDays(dispatch, 1);

  const countTransit = (days: number) => {
    let date = dispatch;
    let remaining = days;
    while (remaining > 0) {
      date = addDays(date, 1);
      if (!isSunday(date)) remaining -= 1;
    }
    return date;
  };

  return {
    dispatch,
    earliest: countTransit(input.minDays),
    latest: countTransit(input.maxDays),
    afterCutoff,
  };
}

const DAY_MONTH = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Tue 16 Sept" without the locale comma. */
export function formatDeliveryDate(date: Date): string {
  const parts = DAY_MONTH.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")}`;
}

/** "Tue 16 Sept" or "Tue 16 Sept to Thu 18 Sept". */
export function formatDeliveryWindow(window: DeliveryWindow): string {
  const a = formatDeliveryDate(window.earliest);
  const b = formatDeliveryDate(window.latest);
  return a === b ? a : `${a} to ${b}`;
}
