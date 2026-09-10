"use client";

import { useActionState } from "react";

import {
  cancelEmailChangeAction,
  changePasswordAction,
  requestEmailChangeAction,
  updateProfileAction,
} from "@/app/(storefront)/account/profile/actions";
import { Field, FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { fieldError, idleState } from "@/lib/account/form-state";
import type { ProfileView } from "@/lib/account/profile";

export function ProfileDetailsForm({ profile }: { profile: ProfileView }) {
  const [state, action, pending] = useActionState(updateProfileAction, idleState);
  return (
    <form action={action} noValidate className="flex max-w-md flex-col gap-4">
      <Field
        id="profile-name"
        label="Name"
        name="name"
        autoComplete="name"
        defaultValue={profile.name ?? ""}
        error={fieldError(state, "name")}
      />
      <Field
        id="profile-phone"
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        hint="Used for delivery updates."
        defaultValue={profile.phone ?? ""}
        error={fieldError(state, "phone")}
      />
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      {state.status === "success" ? (
        <FormMessage tone="success">{state.message}</FormMessage>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save details"}
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm({ profile }: { profile: ProfileView }) {
  const [state, action, pending] = useActionState(changePasswordAction, idleState);
  return (
    <form
      action={action}
      noValidate
      className="flex max-w-md flex-col gap-4"
      key={state.status === "success" ? "done" : "edit"}
    >
      {profile.hasPassword ? (
        <Field
          id="password-current"
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          error={fieldError(state, "currentPassword")}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          You sign in with Google. Set a password to sign in with email as well.
        </p>
      )}
      <Field
        id="password-new"
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={fieldError(state, "newPassword")}
      />
      <Field
        id="password-confirm"
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        error={fieldError(state, "confirmPassword")}
      />
      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}
      {state.status === "success" ? (
        <FormMessage tone="success">{state.message}</FormMessage>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Changing" : profile.hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
    </form>
  );
}

export function EmailForm({ profile }: { profile: ProfileView }) {
  const [state, action, pending] = useActionState(requestEmailChangeAction, idleState);
  return (
    <div className="flex max-w-md flex-col gap-4">
      <p className="text-sm">
        Signed in as <span className="font-medium">{profile.email}</span>.
      </p>
      {profile.pendingEmail ? (
        <div className="flex flex-col gap-2 border-l-2 border-talon pl-3 text-sm">
          <p>
            Waiting for you to confirm <span className="font-medium">{profile.pendingEmail}</span>.
            Check that inbox for the link; it works for 24 hours.
          </p>
          <form action={cancelEmailChangeAction}>
            <Button type="submit" variant="link" size="sm">
              Cancel the change
            </Button>
          </form>
        </div>
      ) : null}
      <form action={action} noValidate className="flex flex-col gap-4">
        <Field
          id="email-new"
          label="New email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={fieldError(state, "email")}
        />
        {profile.hasPassword ? (
          <Field
            id="email-current-password"
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            error={fieldError(state, "currentPassword")}
          />
        ) : null}
        {state.status === "error" && state.message ? (
          <FormMessage tone="error">{state.message}</FormMessage>
        ) : null}
        {state.status === "success" ? (
          <FormMessage tone="success">{state.message}</FormMessage>
        ) : null}
        <div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Sending link" : "Send confirmation link"}
          </Button>
        </div>
      </form>
    </div>
  );
}
