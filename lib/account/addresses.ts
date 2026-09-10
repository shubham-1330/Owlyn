import { db } from "@/lib/db";
import type { AddressFormInput } from "@/lib/validations/account";

/**
 * Address book. Every write is `where: { id, userId }` and checks the
 * affected row count, so another user's address id behaves like a missing
 * one. Deleting is always allowed: orders keep their own address snapshot
 * (Order.shippingAddress / billingAddress JSON) and never reference this
 * table.
 */

export type AddressRow = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  type: "HOME" | "WORK";
  isDefault: boolean;
};

const select = {
  id: true,
  fullName: true,
  phone: true,
  line1: true,
  line2: true,
  landmark: true,
  city: true,
  state: true,
  pincode: true,
  country: true,
  type: true,
  isDefault: true,
} as const;

export function listAddresses(userId: string): Promise<AddressRow[]> {
  return db.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select,
  });
}

export async function createAddress(userId: string, input: AddressFormInput): Promise<AddressRow> {
  return db.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    const makeDefault = input.isDefault || count === 0;
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const { isDefault: _ignored, ...fields } = input;
    void _ignored;
    return tx.address.create({
      data: {
        userId,
        ...fields,
        line2: fields.line2 ?? null,
        landmark: fields.landmark ?? null,
        isDefault: makeDefault,
      },
      select,
    });
  });
}

/** Returns null when the address is not the user's. */
export async function updateAddress(
  userId: string,
  addressId: string,
  input: AddressFormInput,
): Promise<AddressRow | null> {
  return db.$transaction(async (tx) => {
    const { isDefault, ...fields } = input;
    if (isDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const updated = await tx.address.updateMany({
      where: { id: addressId, userId },
      data: {
        ...fields,
        line2: fields.line2 ?? null,
        landmark: fields.landmark ?? null,
        ...(isDefault ? { isDefault: true } : {}),
      },
    });
    if (updated.count === 0) return null;
    // Never leave the book without a default.
    const anyDefault = await tx.address.count({ where: { userId, isDefault: true } });
    if (anyDefault === 0)
      await tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
    return tx.address.findUnique({ where: { id: addressId }, select });
  });
}

export async function deleteAddress(userId: string, addressId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const target = await tx.address.findFirst({
      where: { id: addressId, userId },
      select: { isDefault: true },
    });
    if (!target) return false;
    await tx.address.delete({ where: { id: addressId } });
    if (target.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return true;
  });
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const owned = await tx.address.count({ where: { id: addressId, userId } });
    if (owned === 0) return false;
    await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    await tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
    return true;
  });
}
