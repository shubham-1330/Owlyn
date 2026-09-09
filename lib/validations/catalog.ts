import { z } from "zod";

import { emailSchema } from "@/lib/validations/auth";

export const backInStockSchema = z.object({
  variantId: z.string().trim().min(10).max(40),
  email: emailSchema,
});

export const pincodeSchema = z
  .string({ error: "Enter a pincode." })
  .trim()
  .regex(/^[1-9]\d{5}$/, "Enter a 6-digit pincode.");

export const deliveryEstimateSchema = z.object({
  pincode: pincodeSchema,
  unitPrice: z.number().int().nonnegative(),
});
