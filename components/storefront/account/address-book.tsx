"use client";

import { useState, useTransition } from "react";

import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
  type AddressActionResult,
} from "@/app/(storefront)/account/addresses/actions";
import { lookupPincodeAction } from "@/app/(storefront)/checkout/actions";
import { FormMessage } from "@/components/forms/field";
import { EmptyState } from "@/components/storefront/empty-state";
import {
  AddressFields,
  emptyAddress,
  type AddressFormValues,
} from "@/components/storefront/checkout/address-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { AddressRow } from "@/lib/account/addresses";
import { addressSchema } from "@/lib/validations/checkout";

type Editing = { id: string | null; values: AddressFormValues; isDefault: boolean };

function toForm(a: AddressRow): AddressFormValues {
  return {
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? "",
    landmark: a.landmark ?? "",
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    type: a.type,
  };
}

export function AddressBook({ initial }: { initial: AddressRow[] }) {
  const [addresses, setAddresses] = useState(initial);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormValues, string>>>({});
  const [hint, setHint] = useState<string | undefined>();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AddressRow | null>(null);
  const [pending, start] = useTransition();

  function apply(result: AddressActionResult) {
    if (result.ok) {
      setAddresses(result.addresses);
      setMessage({ tone: "success", text: result.message });
      setEditing(null);
      setConfirmDelete(null);
    } else {
      setMessage({ tone: "error", text: result.message });
      if (result.fieldErrors) {
        const next: Partial<Record<keyof AddressFormValues, string>> = {};
        for (const [k, v] of Object.entries(result.fieldErrors))
          if (v?.[0]) next[k as keyof AddressFormValues] = v[0];
        setErrors(next);
      }
    }
  }

  function openNew() {
    setErrors({});
    setHint(undefined);
    setMessage(null);
    setEditing({ id: null, values: { ...emptyAddress }, isDefault: addresses.length === 0 });
  }

  function openEdit(a: AddressRow) {
    setErrors({});
    setHint(undefined);
    setMessage(null);
    setEditing({ id: a.id, values: toForm(a), isDefault: a.isDefault });
  }

  function save() {
    if (!editing) return;
    const parsed = addressSchema.safeParse({ ...editing.values, country: "IN" });
    if (!parsed.success) {
      const next: Partial<Record<keyof AddressFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AddressFormValues;
        next[key] ||= issue.message;
      }
      setErrors(next);
      return;
    }
    start(async () => {
      apply(
        await saveAddressAction({
          id: editing.id ?? undefined,
          ...parsed.data,
          isDefault: editing.isDefault,
        }),
      );
    });
  }

  async function autofill(pincode: string) {
    const result = await lookupPincodeAction(pincode);
    if (!result.ok) {
      setHint("We do not know this pincode yet. Fill in the city and state.");
      return;
    }
    setHint(`${result.city}, ${result.state}`);
    setEditing((e) =>
      e ? { ...e, values: { ...e.values, city: result.city, state: result.state } } : e,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}

      {addresses.length === 0 ? (
        <EmptyState
          title="No addresses saved."
          description="Add one and checkout fills it in. You can keep a few and pick at checkout."
          action={<Button onClick={openNew}>Add address</Button>}
          className="py-8"
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {addresses.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 border border-border p-5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{a.fullName}</span>
                  <span className="flex gap-1">
                    <Badge variant="muted">{a.type === "WORK" ? "Work" : "Home"}</Badge>
                    {a.isDefault ? <Badge variant="brass">Default</Badge> : null}
                  </span>
                </div>
                <address className="leading-relaxed text-muted-foreground not-italic">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  {a.landmark ? (
                    <>
                      <br />
                      {a.landmark}
                    </>
                  ) : null}
                  <br />
                  {a.city}, {a.state} {a.pincode}
                  <br />
                  <span className="num">{a.phone}</span>
                </address>
                <div className="mt-auto flex flex-wrap gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                    Edit
                  </Button>
                  {!a.isDefault ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => start(async () => apply(await setDefaultAddressAction(a.id)))}
                    >
                      Make default
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(a)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div>
            <Button variant="outline" onClick={openNew}>
              Add address
            </Button>
          </div>
        </>
      )}

      <Modal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={editing?.id ? "Edit address" : "New address"}
        className="max-w-2xl"
      >
        {editing ? (
          <div className="flex flex-col gap-5">
            <AddressFields
              idPrefix="book"
              values={editing.values}
              errors={errors}
              pincodeHint={hint}
              onChange={(patch) => {
                setEditing((e) => (e ? { ...e, values: { ...e.values, ...patch } } : e));
                setErrors((prev) => {
                  const next = { ...prev };
                  for (const k of Object.keys(patch) as Array<keyof AddressFormValues>)
                    delete next[k];
                  return next;
                });
              }}
              onPincodeComplete={(p) => void autofill(p)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.isDefault}
                disabled={
                  addresses.length === 0 ||
                  (editing.id !== null && addresses.find((a) => a.id === editing.id)?.isDefault)
                }
                onChange={(e) =>
                  setEditing((ed) => (ed ? { ...ed, isDefault: e.target.checked } : ed))
                }
              />
              Use as my default address
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={save} disabled={pending}>
                {pending ? "Saving" : "Save address"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title="Delete this address?"
        description="Orders already placed keep the address they were sent to."
      >
        {confirmDelete ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {confirmDelete.fullName}, {confirmDelete.line1}, {confirmDelete.city}{" "}
              {confirmDelete.pincode}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={pending}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => apply(await deleteAddressAction(confirmDelete.id)))
                }
              >
                {pending ? "Deleting" : "Delete address"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
