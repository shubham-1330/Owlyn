import { Button, Section, Text } from "@react-email/components";
import * as React from "react";

import { EmailLayout, emailStyles } from "./layout";

export function EmailChangeEmail({
  name,
  verifyUrl,
  siteUrl,
}: {
  name: string | null;
  verifyUrl: string;
  siteUrl: string;
}) {
  const first = name?.split(" ")[0] || "there";
  return (
    <EmailLayout
      preview="Confirm this is your new email for Owlyn."
      heading="Confirm your new email."
      siteUrl={siteUrl}
    >
      <Text style={emailStyles.text}>
        Hi {first}. Someone asked to move your Owlyn account to this address. If that was you,
        confirm below and we will switch your sign-in and order emails over. The link works for 24
        hours.
      </Text>
      <Section>
        <Button href={verifyUrl} style={emailStyles.button}>
          Confirm new email
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        If this was not you, ignore this email. Nothing changes until the link is used.
      </Text>
    </EmailLayout>
  );
}
