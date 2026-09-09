"use client";

import { useActionState } from "react";

import { submitContactForm } from "@/app/(storefront)/actions/contact";
import { Field, FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial = { status: "idle" as const };

export function ContactForm({
  defaultName,
  defaultEmail,
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [state, action, pending] = useActionState(submitContactForm, initial);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const messageError = errors?.message?.[0];

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-2 border border-border p-6">
        <p className="font-medium">Message received.</p>
        <FormMessage tone="success">{state.message}</FormMessage>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          required
          defaultValue={state.values?.name ?? defaultName}
          error={errors?.name?.[0]}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email ?? defaultEmail}
          error={errors?.email?.[0]}
        />
        <Field
          label="Mobile number"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          hint="Optional."
          defaultValue={state.values?.phone}
          error={errors?.phone?.[0]}
        />
        <Field
          label="Order number"
          name="orderNumber"
          placeholder="OWL-2026-000123"
          hint="Optional. Helps us find your order faster."
          defaultValue={state.values?.orderNumber}
          error={errors?.orderNumber?.[0]}
          className="num"
        />
      </div>
      <Field
        label="Subject"
        name="subject"
        required
        defaultValue={state.values?.subject}
        error={errors?.subject?.[0]}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          defaultValue={state.values?.message}
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? "contact-message-error" : undefined}
        />
        {messageError ? (
          <p id="contact-message-error" className="text-sm text-alert-2">
            {messageError}
          </p>
        ) : null}
      </div>
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-fit">
        {pending ? "Sending" : "Send message"}
      </Button>
    </form>
  );
}
