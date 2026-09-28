import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id with the OWASP-recommended baseline (19 MiB memory, 2 passes,
 * 1 lane). Argon2id is the library default; the hash string records the
 * parameters, so they can be raised later without invalidating old hashes.
 */
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // Malformed hash: treat as a failed verification rather than a server error.
    return false;
  }
}

/**
 * A valid hash of a random password, verified against when an email is unknown
 * so that login timing does not reveal which accounts exist.
 */
let dummyHash: Promise<string> | null = null;
export function timingSafeDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(`dummy-${Math.random().toString(36)}-${Date.now()}`);
  return dummyHash;
}
