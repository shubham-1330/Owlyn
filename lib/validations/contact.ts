import { z } from "zod";

import { emailSchema, indianPhoneSchema } from "@/lib/validations/auth";

export const ORDER_NUMBER_PATTERN = /^OWL-\d{4}-\d{6}$/i;

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(indianPhoneSchema.optional());

const optionalOrderNumber = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value.toUpperCase() : undefined))
  .pipe(
    z.string().regex(ORDER_NUMBER_PATTERN, "Order numbers look like OWL-2026-000123.").optional(),
  );

export const contactSchema = z.object({
  name: z.string({ error: "Enter your name." }).trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  phone: optionalPhone,
  orderNumber: optionalOrderNumber,
  subject: z
    .string({ error: "Add a subject." })
    .trim()
    .min(3, "Add a subject.")
    .max(120, "Keep the subject under 120 characters."),
  message: z
    .string({ error: "Tell us what happened." })
    .trim()
    .min(10, "Give us a little more detail.")
    .max(2000, "Keep it under 2,000 characters."),
});

export type ContactInput = z.infer<typeof contactSchema>;
