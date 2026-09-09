import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Auth.js type augmentation.
 *
 * `User` and `Session` are named re-exports on "next-auth", so augmenting that
 * module merges correctly. `JWT` is star-re-exported from "@auth/core/jwt", and
 * TypeScript cannot merge through a star export, so the JWT augmentation
 * targets the core module directly (hence @auth/core in package.json).
 */

declare module "next-auth" {
  interface User {
    role?: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    /** Epoch ms of the last time role/ban state was re-read from the database. */
    checkedAt?: number;
  }
}
