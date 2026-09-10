"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import { createReturnAction } from "@/app/(storefront)/account/orders/[id]/actions";
import { FormMessage } from "@/components/forms/field";
import {
  AddressFields,
  emptyAddress,
  type AddressFormValues,
} from "@/components/storefront/checkout/address-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/account/form-state";
import { formatINR } from "@/lib/money";
import type { ReturnableOrder } from "@/lib/returns/service";
import { MAX_PHOTOS, RETURN_REASONS } from "@/lib/returns/window";
import { cn } from "@/lib/utils";

type Selection = { qty: number; reason: string };

const selectClass =
  "h-9 rounded-sm border border-input bg-transparent px-2 text-sm text-foreground outline-none hover:border-fog focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring";

export function ReturnForm({ order }: { order: ReturnableOrder }) {
  const [state, formAction, pending] = useActionState(createReturnAction, idleState);
  const [type, setType] = useState<"RETURN" | "EXCHANGE">("RETURN");
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState("");
  const [pickup, setPickup] = useState<AddressFormValues>(() =>
    order.pickupDefault
      ? {
          fullName: order.pickupDefault.fullName,
          phone: order.pickupDefault.phone,
          line1: order.pickupDefault.line1,
          line2: order.pickupDefault.line2 ?? "",
          landmark: order.pickupDefault.landmark ?? "",
          city: order.pickupDefault.city,
          state: order.pickupDefault.state,
          pincode: order.pickupDefault.pincode,
          type: "HOME",
        }
      : { ...emptyAddress },
  );
  const [editPickup, setEditPickup] = useState(!order.pickupDefault);
  const [photoNames, setPhotoNames] = useState<string[]>([]);

  const selectedCount = Object.keys(selected).length;
  const payload = JSON.stringify({
    orderId: order.orderId,
    type,
    reason: reason || undefined,
    comment: comment || undefined,
    items: Object.entries(selected).map(([orderItemId, s]) => ({
      orderItemId,
      qty: s.qty,
      reason: s.reason || reason,
    })),
    pickupAddress: {
      ...pickup,
      country: "IN",
      line2: pickup.line2 || undefined,
      landmark: pickup.landmark || undefined,
    },
  });

  function toggle(orderItemId: string, on: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      if (on) next[orderItemId] = { qty: 1, reason: "" };
      else delete next[orderItemId];
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="payload" value={payload} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">What would you like?</legend>
        <div className="flex gap-2">
          {(
            [
              ["RETURN", "Return for a refund"],
              ["EXCHANGE", "Exchange for another size"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={cn(
                "flex h-10 cursor-pointer items-center rounded-sm border px-4 text-sm",
                type === value ? "border-foreground bg-muted" : "border-input hover:border-fog",
              )}
            >
              <input
                type="radio"
                name="type"
                value={value}
                className="sr-only"
                checked={type === value}
                onChange={() => setType(value)}
              />
              {label}
            </label>
          ))}
        </div>
        {type === "EXCHANGE" ? (
          <p className="text-xs text-muted-foreground">
            Tell us the size you want in the note below. We confirm availability before booking the
            pickup.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Items</legend>
        <ul className="divide-y divide-border border-y border-border">
          {order.items.map((item) => {
            const disabled = item.remaining === 0;
            const sel = selected[item.orderItemId];
            return (
              <li
                key={item.orderItemId}
                className={cn("flex flex-col gap-3 py-4", disabled && "opacity-60")}
              >
                <label className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={Boolean(sel)}
                    onChange={(e) => toggle(item.orderItemId, e.target.checked)}
                    aria-label={`Return ${item.name}, ${item.color}, ${item.size}`}
                  />
                  <div
                    className="relative w-12 shrink-0 overflow-hidden bg-slate"
                    style={{ aspectRatio: "3 / 4" }}
                  >
                    {item.image ? (
                      <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col text-sm">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.color} · {item.size} · {formatINR(item.unitNet)} each ·{" "}
                      {disabled
                        ? "already in a return"
                        : item.returned > 0
                          ? `${item.remaining} of ${item.ordered} still returnable`
                          : `${item.ordered} ${item.ordered === 1 ? "unit" : "units"}`}
                    </span>
                  </div>
                </label>
                {sel ? (
                  <div className="ml-8 flex flex-wrap items-center gap-3 text-sm">
                    {item.remaining > 1 ? (
                      <label className="flex items-center gap-2">
                        Quantity
                        <select
                          className={selectClass}
                          value={sel.qty}
                          onChange={(e) =>
                            setSelected((p) => ({
                              ...p,
                              [item.orderItemId]: { ...sel, qty: Number(e.target.value) },
                            }))
                          }
                        >
                          {Array.from({ length: item.remaining }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="flex items-center gap-2">
                      Reason
                      <select
                        className={selectClass}
                        value={sel.reason}
                        onChange={(e) =>
                          setSelected((p) => ({
                            ...p,
                            [item.orderItemId]: { ...sel, reason: e.target.value },
                          }))
                        }
                      >
                        <option value="">Same as below</option>
                        {RETURN_REASONS.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="return-reason" className="text-sm font-medium">
            Main reason
          </label>
          <select
            id="return-reason"
            className={cn(selectClass, "h-10")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={state.fieldErrors?.reason ? true : undefined}
          >
            <option value="">Choose a reason</option>
            {RETURN_REASONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.reason ? (
            <p className="text-sm text-alert-2">{state.fieldErrors.reason[0]}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="return-photos" className="text-sm font-medium">
            Photos (optional, up to {MAX_PHOTOS})
          </label>
          <input
            id="return-photos"
            type="file"
            name="photos"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="text-sm file:mr-3 file:h-9 file:rounded-sm file:border file:border-border file:bg-transparent file:px-3 file:text-sm file:text-foreground"
            onChange={(e) =>
              setPhotoNames(
                Array.from(e.target.files ?? [])
                  .map((f) => f.name)
                  .slice(0, MAX_PHOTOS),
              )
            }
          />
          {photoNames.length > 0 ? (
            <p className="text-xs text-muted-foreground">{photoNames.join(", ")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">JPEG, PNG or WebP, under 5 MB each.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="return-comment" className="text-sm font-medium">
          {type === "EXCHANGE" ? "Size you want, and anything else" : "Anything else? (optional)"}
        </label>
        <Textarea
          id="return-comment"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Pickup address</h2>
          {order.pickupDefault && !editPickup ? (
            <Button type="button" variant="link" size="sm" onClick={() => setEditPickup(true)}>
              Change
            </Button>
          ) : null}
        </div>
        {editPickup ? (
          <AddressFields
            idPrefix="pickup"
            values={pickup}
            errors={{}}
            onChange={(patch) => setPickup((p) => ({ ...p, ...patch }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {pickup.fullName}, {pickup.line1}
            {pickup.line2 ? `, ${pickup.line2}` : ""}, {pickup.city} {pickup.pincode} ·{" "}
            <span className="num">{pickup.phone}</span>
          </p>
        )}
      </section>

      {state.status === "error" ? <FormMessage tone="error">{state.message}</FormMessage> : null}

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={pending || selectedCount === 0 || !reason}>
          {pending
            ? "Sending"
            : type === "EXCHANGE"
              ? "Request exchange"
              : `Request return${selectedCount > 0 ? ` · ${selectedCount} ${selectedCount === 1 ? "item" : "items"}` : ""}`}
        </Button>
        <p className="text-xs text-muted-foreground">
          Refunds are issued once the parcel is back with us.
        </p>
      </div>
    </form>
  );
}
