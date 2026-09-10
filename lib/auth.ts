import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/lib/auth.config";
import { getCartToken } from "@/lib/cart/cookies";
import { mergeGuestCartIntoUser } from "@/lib/cart/service";
import { verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

/**
 * How often a live session re-reads role, ban state and session version from
 * the database. A password change bumps the version, so other sessions are
 * signed out within this interval.
 */
const SESSION_CHECK_MS = 30 * 1000;

const credentialsSchema = loginSchema.pick({ email: true, password: true });

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user?.passwordHash || user.isBanned) return null;

        const ok = await verifyPassword(user.passwordHash, parsed.data.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      await db.user
        .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
        .catch(() => undefined);
      // Fold the guest bag into the account. Idempotent, so a second callback is harmless.
      try {
        const token = await getCartToken();
        if (token) await mergeGuestCartIntoUser(user.id, token);
      } catch (error) {
        console.error("Guest cart merge failed", error);
      }
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        const row = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true, sessionVersion: true },
        });
        token.id = user.id;
        token.role = row?.role ?? user.role ?? "CUSTOMER";
        token.sessionVersion = row?.sessionVersion ?? 0;
        token.checkedAt = Date.now();
        return token;
      }

      // Re-read role, ban state and session version periodically so demotions,
      // bans and password changes take effect without waiting for expiry.
      const stale = !token.checkedAt || Date.now() - token.checkedAt > SESSION_CHECK_MS;
      if ((stale || trigger === "update") && token.id) {
        const fresh = await db.user.findUnique({
          where: { id: token.id },
          select: { role: true, isBanned: true, sessionVersion: true, email: true },
        });
        if (!fresh || fresh.isBanned) return null;
        if (trigger !== "update" && (token.sessionVersion ?? 0) !== fresh.sessionVersion)
          return null;
        token.role = fresh.role;
        token.sessionVersion = fresh.sessionVersion;
        token.email = fresh.email;
        token.checkedAt = Date.now();
      }
      return token;
    },
  },
});
