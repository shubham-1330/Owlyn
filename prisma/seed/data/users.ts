import type { AddressType, Role } from "@prisma/client";

export type AddressSeed = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  type: AddressType;
  isDefault: boolean;
};

export type UserSeed = {
  key: "admin" | "staff" | "customer";
  email: string;
  password: string;
  name: string;
  role: Role;
  phone?: string;
  addresses?: AddressSeed[];
};

const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase() || "admin@owlyn.example";
const adminPassword = process.env.ADMIN_SEED_PASSWORD?.trim() || "owlyn-admin-2026";

/** All names and addresses are fictional. Passwords are for local development only. */
export const users: UserSeed[] = [
  {
    key: "admin",
    email: adminEmail,
    password: adminPassword,
    name: "Owlyn Admin",
    role: "ADMIN",
    phone: "9800000001",
  },
  {
    key: "staff",
    email: "staff@owlyn.example",
    password: "owlyn-staff-2026",
    name: "Meera Nair",
    role: "STAFF",
    phone: "9800000002",
  },
  {
    key: "customer",
    email: "asha.iyer@example.com",
    password: "owlyn-demo-2026",
    name: "Asha Iyer",
    role: "CUSTOMER",
    phone: "9876543210",
    addresses: [
      {
        id: "seed-address-asha-home",
        fullName: "Asha Iyer",
        phone: "9876543210",
        line1: "14, 3rd Cross, 5th Block",
        line2: "Koramangala",
        landmark: "Opposite the park gate",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560034",
        type: "HOME",
        isDefault: true,
      },
      {
        id: "seed-address-asha-work",
        fullName: "Asha Iyer",
        phone: "9876543210",
        line1: "Tower B, 6th Floor, Prestige Tech Park",
        line2: "Outer Ring Road, Bellandur",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560103",
        type: "WORK",
        isDefault: false,
      },
    ],
  },
];
