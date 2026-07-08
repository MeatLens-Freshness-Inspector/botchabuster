import crypto from "crypto";

interface CsrfTokenInput {
  sessionId: string;
  userId: string;
}

export class CsrfTokenService {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds = 15 * 60,
    private readonly nowMs: () => number = () => Date.now(),
  ) {
    if (!secret.trim()) {
      throw new Error("CSRF token secret is required");
    }
  }

  issueToken(input: CsrfTokenInput): string {
    const issuedAtSeconds = Math.floor(this.nowMs() / 1000);
    const expiresAtSeconds = issuedAtSeconds + this.ttlSeconds;
    const nonce = crypto.randomBytes(16).toString("base64url");
    const payload = [
      "v1",
      input.sessionId,
      input.userId,
      String(issuedAtSeconds),
      String(expiresAtSeconds),
      nonce,
    ].join(".");

    return `${payload}.${this.sign(payload)}`;
  }

  verifyToken(token: string, input: CsrfTokenInput): boolean {
    const parts = token.trim().split(".");
    if (parts.length !== 7) {
      return false;
    }

    const [version, sessionId, userId, _issuedAt, expiresAtRaw, nonce, signature] = parts;
    if (version !== "v1" || sessionId !== input.sessionId || userId !== input.userId) {
      return false;
    }

    const expiresAtSeconds = Number(expiresAtRaw);
    const currentSeconds = Math.floor(this.nowMs() / 1000);
    if (!Number.isFinite(expiresAtSeconds) || expiresAtSeconds <= currentSeconds) {
      return false;
    }

    const payload = [version, sessionId, userId, _issuedAt, expiresAtRaw, nonce].join(".");
    const actualSignature = Buffer.from(signature, "base64url");
    const expectedSignature = Buffer.from(this.sign(payload), "base64url");

    if (actualSignature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(actualSignature, expectedSignature);
  }

  private sign(payload: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(payload)
      .digest("base64url");
  }
}
