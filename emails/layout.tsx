import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

import { BRAND } from "@/lib/brand";

/**
 * Shared email shell. Inline styles only: email clients ignore stylesheets.
 * Dark storefront palette is not used in email; ink text on moon reads
 * everywhere.
 */

export const emailStyles = {
  body: {
    backgroundColor: BRAND.slate,
    fontFamily: "'Inter Tight', Inter, Helvetica, Arial, sans-serif",
    color: BRAND.ink,
    margin: 0,
    padding: "24px 0",
  },
  container: {
    backgroundColor: BRAND.paper,
    maxWidth: "560px",
    margin: "0 auto",
    padding: "32px 28px",
    border: `1px solid ${BRAND.hairline}`,
  },
  wordmark: {
    fontFamily: "Archivo, 'Inter Tight', Helvetica, Arial, sans-serif",
    fontSize: "22px",
    fontWeight: 700 as const,
    letterSpacing: "-0.04em",
    margin: "0 0 24px",
    color: BRAND.ink,
  },
  heading: {
    fontFamily: "Archivo, 'Inter Tight', Helvetica, Arial, sans-serif",
    fontSize: "22px",
    fontWeight: 700 as const,
    letterSpacing: "-0.02em",
    lineHeight: "1.2",
    margin: "0 0 12px",
  },
  text: { fontSize: "15px", lineHeight: "1.55", margin: "0 0 12px" },
  muted: { fontSize: "13px", lineHeight: "1.5", color: BRAND.fogText, margin: "0 0 8px" },
  hr: { borderColor: BRAND.hairline, margin: "20px 0" },
  button: {
    display: "inline-block",
    backgroundColor: BRAND.talon,
    color: BRAND.moon,
    fontSize: "14px",
    fontWeight: 600 as const,
    padding: "12px 20px",
    borderRadius: "2px",
    textDecoration: "none",
  },
  num: { fontVariantNumeric: "tabular-nums" as const },
  tableCell: { fontSize: "14px", padding: "6px 0", verticalAlign: "top" as const },
  tableCellRight: {
    fontSize: "14px",
    padding: "6px 0",
    textAlign: "right" as const,
    fontVariantNumeric: "tabular-nums" as const,
    whiteSpace: "nowrap" as const,
  },
};

export function EmailLayout({
  preview,
  heading,
  siteUrl,
  children,
}: {
  preview: string;
  heading: string;
  siteUrl: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Text style={emailStyles.wordmark}>owlyn</Text>
          <Heading as="h1" style={emailStyles.heading}>
            {heading}
          </Heading>
          {children}
          <Hr style={emailStyles.hr} />
          <Section>
            <Text style={emailStyles.muted}>
              Owlyn Apparel Private Limited, 42, 1st Main Road, Indiranagar, Bengaluru 560038.
            </Text>
            <Text style={emailStyles.muted}>
              Questions? Reply to this email or write to{" "}
              <Link href="mailto:support@owlyn.example" style={{ color: BRAND.dusk }}>
                support@owlyn.example
              </Link>
              .{" "}
              <Link href={`${siteUrl}/pages/returns`} style={{ color: BRAND.dusk }}>
                Returns policy
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
