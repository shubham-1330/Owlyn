import { z } from "zod";

import { emailSchema } from "@/lib/validations/auth";

export const newsletterSchema = z.object({
  email: emailSchema,
  source: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-z0-9-]*$/, "Invalid source.")
    .optional()
    .transform((value) => value || "site"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
