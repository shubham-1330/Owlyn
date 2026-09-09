"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";

import { googleSignInAction, registerAction } from "../actions";
import { initialAuthState } from "../form-state";

export function RegisterForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(registerAction, initialAuthState);
  const googleAction = googleSignInAction.bind(null, next);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} noValidate className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          required
          defaultValue={state.values?.name}
          error={state.fieldErrors?.name?.[0]}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email?.[0]}
        />
        <Field
          label="Mobile number"
          name="phone"
          type="tel"
          autoComplete="tel-national"
          inputMode="numeric"
          placeholder="10 digits"
          hint="Optional. Used for delivery updates and, later, OTP sign-in."
          defaultValue={state.values?.phone}
          error={state.fieldErrors?.phone?.[0]}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters."
          error={state.fieldErrors?.password?.[0]}
        />
        {state.message ? <FormMessage tone="error">{state.message}</FormMessage> : null}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Creating account" : "Create account"}
        </Button>
      </form>

      {googleEnabled ? (
        <form action={googleAction}>
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Continue with Google
          </Button>
        </form>
      ) : null}
    </div>
  );
}
