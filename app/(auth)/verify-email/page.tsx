import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { confirmEmailChange } from "@/lib/account/profile";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };
export const dynamic = "force-dynamic";

const COPY: Record<string, { heading: string; body: string }> = {
  invalid: {
    heading: "That link does not work.",
    body: "It may have been used already, or copied incompletely. Ask for a new one from your profile.",
  },
  expired: {
    heading: "That link has expired.",
    body: "Links last 24 hours. Ask for a new one from your profile.",
  },
  taken: {
    heading: "That email is now on another account.",
    body: "Someone registered it while the link was waiting. Choose a different address from your profile.",
  },
  nothing_pending: {
    heading: "Nothing to confirm.",
    body: "The change was cancelled or already completed.",
  },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await confirmEmailChange(token)
    : ({ ok: false, reason: "invalid" } as const);

  if (result.ok) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl">Email confirmed.</h1>
        <p className="text-muted-foreground">
          Your account now uses <span className="text-foreground">{result.email}</span>. Sign in
          with it from now on; order emails go there too.
        </p>
        <Button asChild>
          <Link href="/account/profile">Back to your profile</Link>
        </Button>
      </div>
    );
  }

  const copy = COPY[result.reason] ?? COPY.invalid!;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">{copy.heading}</h1>
      <p className="text-muted-foreground">{copy.body}</p>
      <Button asChild variant="outline">
        <Link href="/account/profile">Go to your profile</Link>
      </Button>
    </div>
  );
}
