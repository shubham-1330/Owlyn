import type { TrackView } from "@/lib/orders/track";

/** Form state for the guest tracker. Kept out of the "use server" file, which may only export functions. */
export type TrackState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
      values?: { orderNumber: string; contact: string };
    }
  | { status: "found"; view: TrackView };

export const trackIdle: TrackState = { status: "idle" };
