import { z } from "zod";

import { emailSchema, indianPhoneSchema } from "@/lib/validations/auth";
import { pincodeSchema } from "@/lib/validations/catalog";

const name = z
  .string({ error: "Enter the full name." })
  .trim()
  .min(2, "Enter the full name.")
  .max(80);
const line = z.string().trim().max(120);

export const addressSchema = z.object({
  fullName: name,
  phone: indianPhoneSchema,
  line1: z.string({ error: "Enter the address." }).trim().min(3, "Enter the address.").max(120),
  line2: line.optional().transform((v) => v || undefined),
  landmark: line.optional().transform((v) => v || undefined),
  city: z.string({ error: "Enter the city." }).trim().min(2, "Enter the city.").max(80),
  state: z.string({ error: "Enter the state." }).trim().min(2, "Enter the state.").max(80),
  pincode: pincodeSchema,
  country: z.literal("IN").default("IN"),
  type: z.enum(["HOME", "WORK"]).default("HOME"),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const contactSchema = z.object({
  email: emailSchema,
  phone: indianPhoneSchema,
});

export const placeOrderSchema = z.object({
  paymentMethod: z.enum(["RAZORPAY", "COD"]),
  contact: contactSchema,
  shippingAddress: addressSchema,
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: addressSchema.optional(),
  shippingRateId: z.string().trim().min(10).max(40),
  saveAddress: z.boolean().default(false),
  savedAddressId: z.string().trim().min(10).max(40).optional(),
  customerNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
  /** What the shopper saw; the server refuses to charge a different amount silently. */
  expectedTotal: z.number().int().nonnegative().optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const razorpayCallbackSchema = z.object({
  orderId: z.string().trim().min(10).max(40),
  razorpayOrderId: z.string().trim().min(5).max(64),
  razorpayPaymentId: z.string().trim().min(5).max(64),
  razorpaySignature: z.string().trim().min(16).max(256),
});
