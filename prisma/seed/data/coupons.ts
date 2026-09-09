import type { CouponAppliesTo, CouponType } from "@prisma/client";

export type CouponSeed = {
  code: string;
  description: string;
  type: CouponType;
  /** PERCENT: whole percent. FLAT: rupees (converted to paise). */
  value: number;
  minOrderRupees?: number;
  maxDiscountRupees?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startsInDays?: number;
  endsInDays?: number;
  appliesTo?: CouponAppliesTo;
  categoryTypes?: string[];
  productSlugs?: string[];
  collectionSlugs?: string[];
  bxgyBuyQty?: number;
  bxgyGetQty?: number;
  isFirstOrderOnly?: boolean;
  isActive?: boolean;
};

export const coupons: CouponSeed[] = [
  {
    code: "WELCOME10",
    description: "10% off a first order over ₹1,499, up to ₹500.",
    type: "PERCENT",
    value: 10,
    minOrderRupees: 1499,
    maxDiscountRupees: 500,
    perUserLimit: 1,
    isFirstOrderOnly: true,
  },
  {
    code: "FLAT300",
    description: "₹300 off orders over ₹2,499.",
    type: "FLAT",
    value: 300,
    minOrderRupees: 2499,
    usageLimit: 500,
  },
  {
    code: "FREESHIP",
    description: "Free standard shipping on orders over ₹999.",
    type: "FREE_SHIPPING",
    value: 0,
    minOrderRupees: 999,
  },
  {
    code: "NIGHT20",
    description: "20% off the Night Run collection, up to ₹1,500. Ends in 60 days.",
    type: "PERCENT",
    value: 20,
    maxDiscountRupees: 1500,
    endsInDays: 60,
    appliesTo: "COLLECTION",
    collectionSlugs: ["night-run"],
  },
  {
    code: "SOCKS3",
    description: "Buy two sock packs, get a third free.",
    type: "BXGY",
    value: 0,
    appliesTo: "CATEGORY",
    categoryTypes: ["socks"],
    bxgyBuyQty: 2,
    bxgyGetQty: 1,
  },
  {
    code: "LAUNCH25",
    description: "Launch offer, 25% off. Expired.",
    type: "PERCENT",
    value: 25,
    maxDiscountRupees: 2000,
    startsInDays: -120,
    endsInDays: -30,
  },
  {
    code: "STAFF50",
    description: "Staff purchase discount. Switched off until HR signs off.",
    type: "PERCENT",
    value: 50,
    isActive: false,
  },
];
