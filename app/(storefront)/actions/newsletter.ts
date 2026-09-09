"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { newsletterSchema } from "@/lib/validations/newsletter";

export type NewsletterState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: { email?: string[] };
};

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    source: formData.get("source") ?? undefined,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { email, source } = parsed.data;
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing && !existing.unsubscribedAt) {
    return { status: "success", message: "You are already on the list." };
  }

  await db.newsletterSubscriber.upsert({
    where: { email },
    update: { unsubscribedAt: null, source },
    create: { email, source },
  });

  return { status: "success", message: "You are on the list. One email when something new lands." };
}
