import crypto from "crypto";
import { Config } from "../../../config";

interface UnlockTokenPayload {
  userId: string;
  expiresAtMs: number;
  nonce: string;
}

export class DeveloperOptionsService {
  private static instance: DeveloperOptionsService;
  private readonly config: Config;

  private constructor() {
    this.config = Config.getInstance();
  }

  static getInstance(): DeveloperOptionsService {
    if (!DeveloperOptionsService.instance) {
      DeveloperOptionsService.instance = new DeveloperOptionsService();
    }
    return DeveloperOptionsService.instance;
  }

  isConfigured(): boolean {
    return this.config.developerOptionsPassword.length > 0 && this.config.developerOptionsTokenSecret.length > 0;
  }

  verifyPassword(password: string): boolean {
    if (!this.isConfigured()) return false;

    const expected = crypto.createHash("sha256").update(this.config.developerOptionsPassword).digest();
    const received = crypto.createHash("sha256").update(password).digest();
    return crypto.timingSafeEqual(expected, received);
  }

  createUnlockToken(userId: string): { token: string; expiresAt: string } {
    if (!this.isConfigured()) {
      throw new Error("Developer options password is not configured");
    }

    const now = Date.now();
    const expiresAtMs = now + this.config.developerOptionsTokenTtlSeconds * 1000;
    const nonce = crypto.randomBytes(16).toString("hex");

    const payload: UnlockTokenPayload = { userId, expiresAtMs, nonce };
    const serializedPayload = JSON.stringify(payload);
    const encodedPayload = Buffer.from(serializedPayload, "utf8").toString("base64url");
    const signature = this.signPayload(encodedPayload);
    const token = `${encodedPayload}.${signature}`;

    return {
      token,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  verifyUnlockToken(token: string, expectedUserId: string): boolean {
    if (!this.isConfigured()) return false;

    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return false;
    }

    const expectedSignature = this.signPayload(encodedPayload);
    if (!this.signaturesMatch(signature, expectedSignature)) {
      return false;
    }

    let payload: UnlockTokenPayload;
    try {
      const decodedPayload = Buffer.from(encodedPayload, "base64url").toString("utf8");
      payload = JSON.parse(decodedPayload) as UnlockTokenPayload;
    } catch {
      return false;
    }

    if (!payload.userId || payload.userId !== expectedUserId) {
      return false;
    }

    if (!Number.isFinite(payload.expiresAtMs) || payload.expiresAtMs <= Date.now()) {
      return false;
    }

    return true;
  }

  private signPayload(encodedPayload: string): string {
    return crypto
      .createHmac("sha256", this.config.developerOptionsTokenSecret)
      .update(encodedPayload)
      .digest("base64url");
  }

  private signaturesMatch(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
  }
}

export const developerOptionsService = DeveloperOptionsService.getInstance();
