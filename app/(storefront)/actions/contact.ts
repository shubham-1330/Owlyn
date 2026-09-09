"use server";

import { z } from "zod";

import { getSessionUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { contactSchema } from "@/lib/validations/contact";

type ContactField = "name" | "email" | "phone" | "orderNumber" | "subject" | "message";

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<ContactField, string[]>>;
  values?: Partial<Record<ContactField, string>>;
};

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function submitContactForm(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values: Record<ContactField, string> = {
    name: str(formData.get("name")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    orderNumber: str(formData.get("orderNumber")),
    subject: str(formData.get("subject")),
    message: str(formData.get("message")),
  };

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const user = await getSessionUser();
  const data = parsed.data;
  await db.supportTicket.create({
    data: {
      userId: user?.id ?? null,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      orderNumber: data.orderNumber ?? null,
      subject: data.subject,
      message: data.message,
    },
  });

  return {
    status: "success",
    message: `Thanks, ${data.name.split(" ")[0]}. We reply within one working day, usually faster.`,
  };
}
