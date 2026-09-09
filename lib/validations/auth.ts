import { z } from "zod";

/** Shared between client forms and server actions. Messages are shown inline. */

export const emailSchema = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .max(254, "That email address is too long.")
  .pipe(z.email({ error: "Enter a valid email address." }));

export const passwordSchema = z
  .string({ error: "Enter a password." })
  .min(8, "Use at least 8 characters.")
  .max(128, "Keep it under 128 characters.");

/** Indian mobile numbers: 10 digits, first digit 6 to 9. Spaces and a +91 prefix are tolerated. */
export const indianPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=[6-9]\d{9}$)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number."));

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(indianPhoneSchema.optional());

const nextPath = z.string().max(2048).optional();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Enter your password." }).min(1, "Enter your password."),
  next: nextPath,
});

export const registerSchema = z.object({
  name: z
    .string({ error: "Enter your name." })
    .trim()
    .min(2, "Enter your name.")
    .max(80, "Keep your name under 80 characters."),
  email: emailSchema,
  phone: optionalPhone,
  password: passwordSchema,
  next: nextPath,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
