import { PrismaClient } from "@prisma/client";

/**
 * Single Prisma client per process. In development the module graph is
 * re-evaluated on every hot reload, so the instance is cached on `globalThis`
 * to avoid exhausting the Postgres connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export type { Prisma } from "@prisma/client";
