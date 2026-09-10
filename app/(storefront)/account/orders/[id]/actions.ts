"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/account/form-state";
import { cancelOrder } from "@/lib/orders/cancel";
import { OrderError } from "@/lib/orders/types";
import { createReturnRequest, type ReturnPhoto } from "@/lib/returns/service";
import { returnRequestSchema } from "@/lib/validations/account";

const cancelSchema = z.object({
  orderId: z.string().trim().min(10).max(40),
  reason: z
    .string({ error: "Tell us why, in a few words." })
    .trim()
    .min(3, "Tell us why, in a few words.")
    .max(300, "Keep the reason under 300 characters."),
});

export async function cancelOrderAction(
  raw: unknown,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const user = await requireUser("/account/orders");
  const parsed = cancelSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  try {
    const result = await cancelOrder({
      orderId: parsed.data.orderId,
      userId: user.id,
      actorId: user.id,
      reason: parsed.data.reason,
      source: "customer",
    });
    revalidatePath(`/account/orders/${parsed.data.orderId}`);
    revalidatePath("/account/orders");
    revalidatePath("/account");
    return {
      ok: true,
      message: result.refundQueued
        ? `Order ${result.orderNumber} is cancelled. The refund reaches your original payment method within 5 to 7 working days once processed.`
        : `Order ${result.orderNumber} is cancelled. Nothing was charged.`,
    };
  } catch (error) {
    if (error instanceof OrderError) {
      // A missing or foreign order reads the same as a state problem: no existence leak.
      return {
        ok: false,
        message: error.code === "NOT_FOUND" ? "Order not found." : error.message,
      };
    }
    console.error("cancelOrder failed", error);
    return { ok: false, message: "We could not cancel the order just now. Try again in a minute." };
  }
}

function fileToPhoto(file: File): Promise<ReturnPhoto> {
  return file.arrayBuffer().then((buf) => ({ buffer: Buffer.from(buf), contentType: file.type }));
}

export async function createReturnAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/orders");
  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { status: "error", message: "The form could not be read. Reload and try again." };
  }
  const parsed = returnRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      status: "error",
      message: issue?.message ?? "Check the form.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    };
  }
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const photos = await Promise.all(files.map(fileToPhoto));

  let orderNumber: string;
  try {
    const created = await createReturnRequest({ ...parsed.data, userId: user.id, photos });
    orderNumber = created.orderNumber;
  } catch (error) {
    if (error instanceof OrderError) {
      return {
        status: "error",
        message: error.code === "NOT_FOUND" ? "Order not found." : error.message,
      };
    }
    console.error("createReturnRequest failed", error);
    return {
      status: "error",
      message: "We could not raise the request just now. Try again in a minute.",
    };
  }
  revalidatePath(`/account/orders/${parsed.data.orderId}`);
  revalidatePath("/account/returns");
  revalidatePath("/account");
  redirect(`/account/returns?raised=${encodeURIComponent(orderNumber)}`);
}
