const LEGACY_STORAGE_KEY = "meatlens-offline-cred";
const ITERATIONS = 100_000;
const ALGORITHM = "pbkdf2-sha256";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function deriveHash(email: string, password: string, iterations = ITERATIONS): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(normalizeEmail(email)),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return Array.from(new Uint8Array(bits))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

export interface PasswordVerifierRecord {
  email: string;
  hash: string;
  algorithm: typeof ALGORITHM;
  iterations: number;
}

export async function createPasswordVerifier(
  email: string,
  password: string,
): Promise<PasswordVerifierRecord> {
  return {
    email: normalizeEmail(email),
    hash: await deriveHash(email, password),
    algorithm: ALGORITHM,
    iterations: ITERATIONS,
  };
}

export async function verifyPasswordVerifier(
  verifier: PasswordVerifierRecord,
  email: string,
  password: string,
): Promise<boolean> {
  if (
    verifier.algorithm !== ALGORITHM ||
    !Number.isFinite(verifier.iterations) ||
    verifier.iterations <= 0
  ) {
    return false;
  }

  if (normalizeEmail(email) !== normalizeEmail(verifier.email)) {
    return false;
  }

  const inputHash = await deriveHash(email, password, verifier.iterations);
  return safeEqual(inputHash, verifier.hash);
}

export function readLegacyOfflineCredential(): PasswordVerifierRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PasswordVerifierRecord> & {
      email?: unknown;
      hash?: unknown;
      iterations?: unknown;
    };
    if (typeof parsed.email !== "string" || typeof parsed.hash !== "string") {
      return null;
    }

    return {
      email: normalizeEmail(parsed.email),
      hash: parsed.hash,
      algorithm: ALGORITHM,
      iterations:
        typeof parsed.iterations === "number" &&
        Number.isFinite(parsed.iterations) &&
        parsed.iterations > 0
          ? parsed.iterations
          : ITERATIONS,
    };
  } catch {
    return null;
  }
}

export function clearLegacyOfflineCredential(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}
