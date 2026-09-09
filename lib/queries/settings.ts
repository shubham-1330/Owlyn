import { CACHE_TAGS, cached } from "@/lib/cache";
import { db } from "@/lib/db";

export type StoreConfig = {
  name: string;
  tagline: string;
  legalName: string;
  gstin: string;
  supportEmail: string;
  supportPhone: string;
  supportHours: string;
  address: { line1: string; line2: string; city: string; state: string; pincode: string };
  codLimit: number;
  freeShippingThreshold: number;
  returnsWindowDays: number;
  warrantyDays: number;
  trendingSearches: string[];
  social: { instagram?: string; youtube?: string };
  maintenance: boolean;
};

const DEFAULTS: StoreConfig = {
  name: "Owlyn",
  tagline: "For the hours nobody sees.",
  legalName: "Owlyn Apparel Private Limited",
  gstin: "",
  supportEmail: "support@owlyn.example",
  supportPhone: "",
  supportHours: "",
  address: { line1: "", line2: "", city: "Bengaluru", state: "Karnataka", pincode: "" },
  codLimit: 1_000_000,
  freeShippingThreshold: 199_900,
  returnsWindowDays: 7,
  warrantyDays: 90,
  trendingSearches: [],
  social: {},
  maintenance: false,
};

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Store configuration from the Setting table, with safe defaults for anything missing. */
export const getStoreConfig = cached(
  async (): Promise<StoreConfig> => {
    const rows = await db.setting.findMany();
    const s = Object.fromEntries(rows.map((r) => [r.key, r.value as unknown]));
    const address = record(s["store.address"]);
    const social = record(s["social"]);
    return {
      name: str(s["store.name"], DEFAULTS.name),
      tagline: str(s["store.tagline"], DEFAULTS.tagline),
      legalName: str(s["store.legalName"], DEFAULTS.legalName),
      gstin: str(s["store.gstin"], DEFAULTS.gstin),
      supportEmail: str(s["support.email"], DEFAULTS.supportEmail),
      supportPhone: str(s["support.phone"], DEFAULTS.supportPhone),
      supportHours: str(s["support.hours"], DEFAULTS.supportHours),
      address: {
        line1: str(address.line1, DEFAULTS.address.line1),
        line2: str(address.line2, DEFAULTS.address.line2),
        city: str(address.city, DEFAULTS.address.city),
        state: str(address.state, DEFAULTS.address.state),
        pincode: str(address.pincode, DEFAULTS.address.pincode),
      },
      codLimit: num(s["checkout.codLimit"], DEFAULTS.codLimit),
      freeShippingThreshold: num(s["shipping.freeThreshold"], DEFAULTS.freeShippingThreshold),
      returnsWindowDays: num(s["returns.windowDays"], DEFAULTS.returnsWindowDays),
      warrantyDays: num(s["returns.warrantyDays"], DEFAULTS.warrantyDays),
      trendingSearches: strList(s["search.trending"]),
      social: {
        instagram: str(social.instagram, "") || undefined,
        youtube: str(social.youtube, "") || undefined,
      },
      maintenance: bool(s["maintenance.enabled"], DEFAULTS.maintenance),
    };
  },
  ["store-config"],
  [CACHE_TAGS.settings],
);
