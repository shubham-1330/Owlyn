import { z } from "zod";

import { ORDER_NUMBER_PATTERN } from "@/lib/orders/order-number";
import { RETURN_REASON_CODES } from "@/lib/returns/window";
import { emailSchema, indianPhoneSchema, passwordSchema } from "@/lib/validations/auth";
import { addressSchema } from "@/lib/validations/checkout";

const id = z.string().trim().min(10).max(40);

export const profileSchema = z.object({
  name: z
    .string({ error: "Enter your name." })
    .trim()
    .min(2, "Enter your name.")
    .max(80, "Keep your name under 80 characters."),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(indianPhoneSchema.optional()),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string().max(128),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords do not match.",
  });

export const emailChangeSchema = z.object({
  email: emailSchema,
  currentPassword: z.string().max(128).optional(),
});

export const addressFormSchema = addressSchema.extend({
  isDefault: z.boolean().default(false),
});

export type AddressFormInput = z.infer<typeof addressFormSchema>;

export const returnItemSchema = z.object({
  orderItemId: id,
  qty: z.number().int().min(1).max(50),
  reason: z.enum(RETURN_REASON_CODES, { error: "Choose a reason." }),
});

export const returnRequestSchema = z.object({
  orderId: id,
  type: z.enum(["RETURN", "EXCHANGE"]),
  reason: z.enum(RETURN_REASON_CODES, { error: "Choose a reason." }),
  comment: z
    .string()
    .trim()
    .max(1000, "Keep the note under 1,000 characters.")
    .optional()
    .transform((v) => v || undefined),
  items: z.array(returnItemSchema).min(1, "Pick at least one item."),
  pickupAddress: addressSchema,
});

export type ReturnRequestInput = z.infer<typeof returnRequestSchema>;

export const trackSchema = z.object({
  orderNumber: z
    .string({ error: "Enter your order number." })
    .trim()
    .toUpperCase()
    .regex(ORDER_NUMBER_PATTERN, "Order numbers look like OWL-2026-000123."),
  contact: z
    .string({ error: "Enter the email or mobile number on the order." })
    .trim()
    .min(3, "Enter the email or mobile number on the order.")
    .max(254),
});

export const ORDER_LIST_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
] as const;

export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  status: z.enum(ORDER_LIST_STATUSES).optional().catch(undefined),
  q: z
    .string()
    .trim()
    .max(40)
    .optional()
    .catch(undefined)
    .transform((v) => v || undefined),
});

export type OrdersQuery = z.infer<typeof ordersQuerySchema>;
