"use client";

import { useActionState } from "react";

import { trackOrderAction } from "@/app/(storefront)/track/actions";
import { trackIdle } from "@/app/(storefront)/track/state";
import { Field, FormMessage } from "@/components/forms/field";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { Button } from "@/components/ui/button";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function TrackForm() {
  const [state, action, pending] = useActionState(trackOrderAction, trackIdle);
  const values = state.status === "error" ? state.values : undefined;

  return (
    <div className="flex flex-col gap-10">
      <form action={action} noValidate className="flex max-w-md flex-col gap-4">
        <Field
          label="Order number"
          name="orderNumber"
          placeholder="OWL-2026-000123"
          autoComplete="off"
          defaultValue={values?.orderNumber}
          error={state.status === "error" ? state.fieldErrors?.orderNumber?.[0] : undefined}
        />
        <Field
          label="Email or mobile number on the order"
          name="contact"
          autoComplete="email"
          defaultValue={values?.contact}
          error={state.status === "error" ? state.fieldErrors?.contact?.[0] : undefined}
        />
        {state.status === "error" && !state.fieldErrors ? (
          <FormMessage tone="error">{state.message}</FormMessage>
        ) : null}
        <div>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Looking it up" : "Track order"}
          </Button>
        </div>
      </form>

      {state.status === "found" ? (
        <section aria-live="polite" className="flex flex-col gap-6 border-t border-border pt-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl num">{state.view.orderNumber}</h2>
            <OrderStatusBadge status={state.view.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {state.view.itemCount} {state.view.itemCount === 1 ? "item" : "items"}
            {state.view.placedAt ? `, placed ${DATE.format(new Date(state.view.placedAt))}` : ""}
            {state.view.city ? `, going to ${state.view.city}` : ""}.
            {state.view.deliveryWindow &&
            (state.view.status === "CONFIRMED" ||
              state.view.status === "PACKED" ||
              state.view.status === "SHIPPED")
              ? ` Expected ${state.view.deliveryWindow}.`
              : ""}
          </p>
          <OrderTimeline timeline={state.view.timeline} shipment={state.view.shipment} />
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {state.view.items.map((item, i) => (
              <li key={i}>
                {item.name} · {item.color} · {item.size} · Qty {item.qty}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
