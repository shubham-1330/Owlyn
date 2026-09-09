"use client";

import { useActionState } from "react";

import { requestBackInStock } from "@/app/(storefront)/products/[slug]/actions";
import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial = { status: "idle" as const };

export function NotifyForm({
  variantId,
  sizeLabel,
  defaultEmail,
}: {
  variantId: string;
  sizeLabel: string;
  defaultEmail?: string | null;
}) {
  const [state, action, pending] = useActionState(requestBackInStock, initial);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-2 border border-border p-4">
      <input type="hidden" name="variantId" value={variantId} />
      <p className="text-sm">
        {sizeLabel} is sold out. Leave an email and we will tell you when it is back.
      </p>
      <div className="flex gap-2">
        <Label htmlFor={`notify-${variantId}`} className="sr-only">
          Email
        </Label>
        <Input
          id={`notify-${variantId}`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={defaultEmail ?? undefined}
          aria-invalid={state.status === "error" ? true : undefined}
          required
        />
        <Button type="submit" variant="outline" disabled={pending} className="shrink-0">
          {pending ? "Saving" : "Notify me"}
        </Button>
      </div>
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
    </form>
  );
}
