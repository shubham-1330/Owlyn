import type { Prisma } from "@prisma/client";

/**
 * Human-readable identifiers backed by Postgres sequences, so concurrent
 * inserts can never collide: `nextval` is atomic per call and the columns
 * carry unique constraints as a second line of defence.
 */

export function formatOrderNumber(sequence: number | bigint, year: number): string {
  return `OWL-${year}-${String(sequence).padStart(6, "0")}`;
}

export function formatInvoiceNumber(sequence: number | bigint, year: number): string {
  return `OWL-INV-${year}-${String(sequence).padStart(6, "0")}`;
}

export const ORDER_NUMBER_PATTERN = /^OWL-\d{4}-\d{6}$/;

type Client = Prisma.TransactionClient | { $queryRaw: Prisma.TransactionClient["$queryRaw"] };

export async function nextOrderNumber(client: Client, now = new Date()): Promise<string> {
  const rows = await client.$queryRaw<
    Array<{ n: bigint }>
  >`SELECT nextval('order_number_seq') AS n`;
  return formatOrderNumber(rows[0]!.n, now.getFullYear());
}

export async function nextInvoiceNumber(client: Client, now = new Date()): Promise<string> {
  const rows = await client.$queryRaw<
    Array<{ n: bigint }>
  >`SELECT nextval('invoice_number_seq') AS n`;
  return formatInvoiceNumber(rows[0]!.n, now.getFullYear());
}
