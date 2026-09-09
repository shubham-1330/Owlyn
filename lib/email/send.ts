import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { render } from "@react-email/render";
import { Resend } from "resend";

/**
 * One send function. With RESEND_API_KEY it goes through Resend; without it
 * (local development) the rendered email is written to .dev-outbox/ and
 * logged, so templates can be inspected and nothing silently vanishes.
 */

export type SendResult = { delivered: "resend" | "outbox"; id: string | null };

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Owlyn <orders@owlyn.example>";
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  react: React.ReactElement;
  tags?: Record<string, string>;
}): Promise<SendResult> {
  const html = await render(input.react);
  const text = await render(input.react, { plainText: true });

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html,
      text,
      tags: input.tags
        ? Object.entries(input.tags).map(([name, value]) => ({ name, value }))
        : undefined,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    return { delivered: "resend", id: data?.id ?? null };
  }

  const dir = path.resolve(process.cwd(), ".dev-outbox");
  await mkdir(dir, { recursive: true });
  const slug = input.subject
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60);
  const file = path.join(dir, `${Date.now()}-${slug}.html`);
  await writeFile(file, `<!-- to: ${input.to} -->\n${html}`);
  console.info(`[email:outbox] ${input.to} | ${input.subject} -> ${file}`);
  return { delivered: "outbox", id: null };
}
