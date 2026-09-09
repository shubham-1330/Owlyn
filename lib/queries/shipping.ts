import { CACHE_TAGS, cached } from "@/lib/cache";
import { db } from "@/lib/db";

export type ShippingRateData = {
  id: string;
  name: string;
  type: "FLAT" | "WEIGHT";
  baseRate: number;
  perKgRate: number | null;
  freeAbove: number | null;
  minDays: number;
  maxDays: number;
};

export type ShippingZoneData = {
  id: string;
  name: string;
  pincodePrefixes: string[];
  codAvailable: boolean;
  isDefault: boolean;
  isActive: boolean;
  rates: ShippingRateData[];
};

export const getShippingZones = cached(
  async (): Promise<ShippingZoneData[]> =>
    db.shippingZone.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        name: true,
        pincodePrefixes: true,
        codAvailable: true,
        isDefault: true,
        isActive: true,
        rates: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
            baseRate: true,
            perKgRate: true,
            freeAbove: true,
            minDays: true,
            maxDays: true,
          },
        },
      },
    }),
  ["shipping:zones"],
  [CACHE_TAGS.shipping],
);

export type PincodeData = {
  pincode: string;
  city: string;
  state: string;
  isServiceable: boolean;
  codAvailable: boolean;
  zoneId: string | null;
};

/** Direct lookup; the directory is large and per-pincode, so it is not cached. */
export function lookupPincode(pincode: string): Promise<PincodeData | null> {
  return db.pincode.findUnique({
    where: { pincode },
    select: {
      pincode: true,
      city: true,
      state: true,
      isServiceable: true,
      codAvailable: true,
      zoneId: true,
    },
  });
}
