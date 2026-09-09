import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js configuration. Imported by middleware, so nothing here may
 * touch Prisma, argon2 or any other Node-only module. The full configuration in
 * lib/auth.ts spreads this and adds the adapter and the credentials provider.
 */

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  trustHost: true,
  providers: googleEnabled
    ? [
        Google({
          // Google verifies email ownership, so linking a Google sign-in to an
          // existing password account with the same address is safe.
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "CUSTOMER";
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.user.role = token.role ?? "CUSTOMER";
      return session;
    },
  },
} satisfies NextAuthConfig;
