"use client";

import { useActionState } from "react";

import { Field, FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";

import { googleSignInAction, loginAction } from "../actions";
import { initialAuthState } from "../form-state";

export function LoginForm({
  next,
  googleEnabled,
  authError,
}: {
  next: string;
  googleEnabled: boolean;
  authError?: string;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialAuthState);
  const googleAction = googleSignInAction.bind(null, next);
  const message = state.message ?? authError;

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} noValidate className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />
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
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password?.[0]}
        />
        {message ? <FormMessage tone="error">{message}</FormMessage> : null}
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Signing in" : "Sign in"}
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
