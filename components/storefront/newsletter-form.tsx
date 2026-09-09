"use client";

import { useActionState } from "react";

import { subscribeToNewsletter } from "@/app/(storefront)/actions/newsletter";
import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial = { status: "idle" as const };

export function NewsletterForm({ source = "site" }: { source?: string }) {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial);
  const error =
    state.status === "error" ? (state.fieldErrors?.email?.[0] ?? state.message) : undefined;

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={action} noValidate className="flex w-full max-w-md flex-col gap-3">
      <input type="hidden" name="source" value={source} />
      <Label htmlFor={`newsletter-email-${source}`} className="sr-only">
        Email
      </Label>
      <div className="flex gap-2">
        <Input
          id={`newsletter-email-${source}`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `newsletter-error-${source}` : undefined}
          className="bg-ink"
          required
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Adding" : "Subscribe"}
        </Button>
      </div>
      {error ? (
        <p id={`newsletter-error-${source}`} className="text-sm text-alert-2" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          One email when something new lands. Unsubscribe any time.
        </p>
      )}
    </form>
  );
}
