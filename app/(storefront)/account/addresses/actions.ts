"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
  type AddressRow,
} from "@/lib/account/addresses";
import { requireUser } from "@/lib/auth/guards";
import { addressFormSchema } from "@/lib/validations/account";

export type AddressActionResult =
  | { ok: true; addresses: AddressRow[]; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[] | undefined> };

const idSchema = z.string().trim().min(10).max(40);

function bust() {
  revalidatePath("/account/addresses");
  revalidatePath("/account");
  revalidatePath("/checkout");
}

export async function saveAddressAction(raw: unknown): Promise<AddressActionResult> {
  const user = await requireUser("/account/addresses");
  const wrapper = z.object({ id: idSchema.optional() }).safeParse(raw);
  const parsed = addressFormSchema.safeParse(raw);
  if (!wrapper.success || !parsed.success) {
    const err = parsed.success ? undefined : z.flattenError(parsed.error).fieldErrors;
    return {
      ok: false,
      message: "Check the highlighted fields.",
      fieldErrors: err as Record<string, string[]>,
    };
  }
  const id = wrapper.data.id;
  if (id) {
    const updated = await updateAddress(user.id, id, parsed.data);
    if (!updated) return { ok: false, message: "Address not found." };
  } else {
    await createAddress(user.id, parsed.data);
  }
  bust();
  return {
    ok: true,
    addresses: await listAddresses(user.id),
    message: id ? "Address updated." : "Address added.",
  };
}

export async function deleteAddressAction(raw: unknown): Promise<AddressActionResult> {
  const user = await requireUser("/account/addresses");
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Address not found." };
  const removed = await deleteAddress(user.id, parsed.data);
  if (!removed) return { ok: false, message: "Address not found." };
  bust();
  return {
    ok: true,
    addresses: await listAddresses(user.id),
    message: "Address removed. Past orders keep the address they were sent to.",
  };
}

export async function setDefaultAddressAction(raw: unknown): Promise<AddressActionResult> {
  const user = await requireUser("/account/addresses");
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Address not found." };
  const done = await setDefaultAddress(user.id, parsed.data);
  if (!done) return { ok: false, message: "Address not found." };
  bust();
  return { ok: true, addresses: await listAddresses(user.id), message: "Default address updated." };
}
