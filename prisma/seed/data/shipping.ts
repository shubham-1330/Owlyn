import type { ShippingRateType } from "@prisma/client";

export type RateSeed = {
  name: string;
  type: ShippingRateType;
  baseRupees: number;
  perKgRupees?: number;
  freeAboveRupees?: number;
  minDays: number;
  maxDays: number;
};

export type ZoneSeed = {
  id: string;
  name: string;
  pincodePrefixes: string[];
  codAvailable: boolean;
  isDefault: boolean;
  rates: RateSeed[];
};

export const zones: ZoneSeed[] = [
  {
    id: "seed-zone-metro",
    name: "Metro",
    pincodePrefixes: ["11", "122", "201", "40", "41", "50", "56", "60", "70"],
    codAvailable: true,
    isDefault: false,
    rates: [
      {
        name: "Standard",
        type: "FLAT",
        baseRupees: 79,
        freeAboveRupees: 1999,
        minDays: 2,
        maxDays: 4,
      },
      { name: "Express", type: "FLAT", baseRupees: 199, minDays: 1, maxDays: 2 },
    ],
  },
  {
    id: "seed-zone-rest",
    name: "Rest of India",
    pincodePrefixes: [],
    codAvailable: true,
    isDefault: true,
    rates: [
      {
        name: "Standard",
        type: "FLAT",
        baseRupees: 99,
        freeAboveRupees: 1999,
        minDays: 4,
        maxDays: 7,
      },
    ],
  },
  {
    id: "seed-zone-remote",
    name: "Remote and North-East",
    pincodePrefixes: ["19", "737", "78", "79", "744"],
    codAvailable: false,
    isDefault: false,
    rates: [
      {
        name: "Standard",
        type: "WEIGHT",
        baseRupees: 149,
        perKgRupees: 60,
        freeAboveRupees: 2999,
        minDays: 7,
        maxDays: 12,
      },
    ],
  },
];

export type PincodeSeed = { pincode: string; city: string; state: string; district?: string };

/** A small directory for auto-fill and serviceability demos. Admin can upload the full set via CSV. */
export const pincodes: PincodeSeed[] = [
  { pincode: "560001", city: "Bengaluru", state: "Karnataka", district: "Bengaluru Urban" },
  { pincode: "560034", city: "Bengaluru", state: "Karnataka", district: "Bengaluru Urban" },
  { pincode: "560103", city: "Bengaluru", state: "Karnataka", district: "Bengaluru Urban" },
  { pincode: "400001", city: "Mumbai", state: "Maharashtra", district: "Mumbai" },
  { pincode: "400050", city: "Mumbai", state: "Maharashtra", district: "Mumbai Suburban" },
  { pincode: "400076", city: "Mumbai", state: "Maharashtra", district: "Mumbai Suburban" },
  { pincode: "110001", city: "New Delhi", state: "Delhi", district: "Central Delhi" },
  { pincode: "110016", city: "New Delhi", state: "Delhi", district: "South Delhi" },
  { pincode: "122002", city: "Gurugram", state: "Haryana", district: "Gurugram" },
  { pincode: "201301", city: "Noida", state: "Uttar Pradesh", district: "Gautam Buddha Nagar" },
  { pincode: "600001", city: "Chennai", state: "Tamil Nadu", district: "Chennai" },
  { pincode: "600040", city: "Chennai", state: "Tamil Nadu", district: "Chennai" },
  { pincode: "500001", city: "Hyderabad", state: "Telangana", district: "Hyderabad" },
  { pincode: "500081", city: "Hyderabad", state: "Telangana", district: "Ranga Reddy" },
  { pincode: "700001", city: "Kolkata", state: "West Bengal", district: "Kolkata" },
  { pincode: "700091", city: "Kolkata", state: "West Bengal", district: "North 24 Parganas" },
  { pincode: "411001", city: "Pune", state: "Maharashtra", district: "Pune" },
  { pincode: "411057", city: "Pune", state: "Maharashtra", district: "Pune" },
  { pincode: "380001", city: "Ahmedabad", state: "Gujarat", district: "Ahmedabad" },
  { pincode: "302001", city: "Jaipur", state: "Rajasthan", district: "Jaipur" },
  { pincode: "226001", city: "Lucknow", state: "Uttar Pradesh", district: "Lucknow" },
  { pincode: "682001", city: "Kochi", state: "Kerala", district: "Ernakulam" },
  { pincode: "641001", city: "Coimbatore", state: "Tamil Nadu", district: "Coimbatore" },
  { pincode: "160017", city: "Chandigarh", state: "Chandigarh", district: "Chandigarh" },
  { pincode: "751001", city: "Bhubaneswar", state: "Odisha", district: "Khordha" },
  { pincode: "800001", city: "Patna", state: "Bihar", district: "Patna" },
  { pincode: "462001", city: "Bhopal", state: "Madhya Pradesh", district: "Bhopal" },
  { pincode: "403001", city: "Panaji", state: "Goa", district: "North Goa" },
  { pincode: "781001", city: "Guwahati", state: "Assam", district: "Kamrup Metropolitan" },
  { pincode: "793001", city: "Shillong", state: "Meghalaya", district: "East Khasi Hills" },
  { pincode: "190001", city: "Srinagar", state: "Jammu and Kashmir", district: "Srinagar" },
  {
    pincode: "744101",
    city: "Port Blair",
    state: "Andaman and Nicobar Islands",
    district: "South Andaman",
  },
];
