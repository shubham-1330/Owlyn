import argon2 from "argon2";

/**
 * argon2id with the OWASP minimum-recommended parameters:
 * 19 MiB memory, 2 iterations, 1 lane. Node-only; never import from edge code.
 */
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, HASH_OPTIONS);
}

/** Constant-time verify. Returns false on malformed hashes instead of throwing. */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** True when a stored hash was made with weaker parameters and should be re-hashed on next login. */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, HASH_OPTIONS);
}
