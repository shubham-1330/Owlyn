import type { Metadata } from "next";

import { FormMessage } from "@/components/forms/field";
import {
  EmailForm,
  PasswordForm,
  ProfileDetailsForm,
} from "@/components/storefront/account/profile-forms";
import { getProfile } from "@/lib/account/profile";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
  const [{ password }, user] = await Promise.all([searchParams, requireUser("/account/profile")]);
  const profile = await getProfile(user.id);
  if (!profile) return null;

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl">Profile</h1>
        <p className="text-muted-foreground">Your details, password and email.</p>
      </header>

      <section aria-labelledby="details" className="flex flex-col gap-4">
        <h2 id="details" className="text-lg">
          Details
        </h2>
        <ProfileDetailsForm profile={profile} />
      </section>

      <section
        aria-labelledby="password"
        className="flex flex-col gap-4 border-t border-border pt-8"
      >
        <h2 id="password" className="text-lg">
          Password
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Changing it signs out every other device. This one stays signed in.
        </p>
        {password === "changed" ? (
          <FormMessage tone="success">
            Password changed. Every other device has been signed out.
          </FormMessage>
        ) : null}
        <PasswordForm profile={profile} />
      </section>

      <section aria-labelledby="email" className="flex flex-col gap-4 border-t border-border pt-8">
        <h2 id="email" className="text-lg">
          Email
        </h2>
        <EmailForm profile={profile} />
      </section>
    </>
  );
}
