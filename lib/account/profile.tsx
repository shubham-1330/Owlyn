import { createHash, randomBytes } from "node:crypto";

import { EmailChangeEmail } from "@/emails/email-change";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { absoluteUrl } from "@/lib/site";

/**
 * Profile changes. Password change bumps User.sessionVersion so every other
 * JWT is rejected on its next check; the caller refreshes its own token.
 * Email change writes pendingEmail and sends a verification link to the new
 * address; nothing changes until that link is used.
 */

export class ProfileError extends Error {
  constructor(
    message: string,
    public readonly field?: "name" | "phone" | "currentPassword" | "newPassword" | "email",
  ) {
    super(message);
    this.name = "ProfileError";
  }
}

export type ProfileView = {
  name: string | null;
  email: string;
  pendingEmail: string | null;
  phone: string | null;
  hasPassword: boolean;
  googleLinked: boolean;
};

export async function getProfile(userId: string): Promise<ProfileView | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      pendingEmail: true,
      phone: true,
      passwordHash: true,
      accounts: { where: { provider: "google" }, select: { id: true } },
    },
  });
  if (!user) return null;
  return {
    name: user.name,
    email: user.email,
    pendingEmail: user.pendingEmail,
    phone: user.phone,
    hasPassword: Boolean(user.passwordHash),
    googleLinked: user.accounts.length > 0,
  };
}

export async function updateProfile(
  userId: string,
  input: { name: string; phone?: string },
): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { name: input.name, phone: input.phone ?? null },
  });
}

/**
 * Requires the current password when one is set. A Google-only account may
 * set its first password without one. Returns the new session version.
 */
export async function changePassword(
  userId: string,
  input: { currentPassword?: string; newPassword: string },
): Promise<{ sessionVersion: number; email: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!user) throw new ProfileError("Account not found.");
  if (user.passwordHash) {
    if (!input.currentPassword) {
      throw new ProfileError("Enter your current password.", "currentPassword");
    }
    const ok = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!ok) throw new ProfileError("That is not your current password.", "currentPassword");
    if (input.currentPassword === input.newPassword) {
      throw new ProfileError("Choose a password you have not used here before.", "newPassword");
    }
  }
  const updated = await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword), sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return { sessionVersion: updated.sessionVersion, email: user.email };
}

const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestEmailChange(
  userId: string,
  input: { email: string; currentPassword?: string },
): Promise<{ pendingEmail: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, passwordHash: true },
  });
  if (!user) throw new ProfileError("Account not found.");
  if (input.email === user.email) throw new ProfileError("That is already your email.", "email");
  if (user.passwordHash) {
    if (!input.currentPassword)
      throw new ProfileError("Enter your password to change your email.", "currentPassword");
    const ok = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!ok) throw new ProfileError("That is not your current password.", "currentPassword");
  }
  const taken = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (taken) throw new ProfileError("Another account already uses that email.", "email");

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.authToken.updateMany({
      where: { userId, type: "EMAIL_VERIFY", usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.authToken.create({
      data: {
        userId,
        type: "EMAIL_VERIFY",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
      },
    }),
    db.user.update({ where: { id: userId }, data: { pendingEmail: input.email } }),
  ]);

  const verifyUrl = absoluteUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  await sendEmail({
    to: input.email,
    subject: "Confirm your new email for Owlyn",
    react: <EmailChangeEmail name={user.name} verifyUrl={verifyUrl} siteUrl={absoluteUrl("/")} />,
    tags: { type: "email_change" },
  });
  return { pendingEmail: input.email };
}

export type ConfirmEmailResult =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "expired" | "taken" | "nothing_pending" };

export async function confirmEmailChange(token: string): Promise<ConfirmEmailResult> {
  const row = await db.authToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, pendingEmail: true } } },
  });
  if (!row || row.type !== "EMAIL_VERIFY" || row.usedAt) return { ok: false, reason: "invalid" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  const next = row.user.pendingEmail;
  if (!next) return { ok: false, reason: "nothing_pending" };
  const taken = await db.user.findUnique({ where: { email: next }, select: { id: true } });
  if (taken && taken.id !== row.user.id) return { ok: false, reason: "taken" };

  await db.$transaction([
    db.user.update({
      where: { id: row.user.id },
      data: { email: next, emailVerified: new Date(), pendingEmail: null },
    }),
    db.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true, email: next };
}

export async function cancelEmailChange(userId: string): Promise<void> {
  await db.$transaction([
    db.authToken.updateMany({
      where: { userId, type: "EMAIL_VERIFY", usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.user.update({ where: { id: userId }, data: { pendingEmail: null } }),
  ]);
}
