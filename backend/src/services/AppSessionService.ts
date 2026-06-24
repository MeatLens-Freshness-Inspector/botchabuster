import crypto from "crypto";

export interface AppSessionUser {
  id: string;
  email: string | null;
}

export interface AppSession {
  access_token: string;
  refresh_token: null;
  token_type: "bearer";
  expires_in: number;
  expires_at: number;
}

interface AppSessionPayload {
  iss: "meatlens-app";
  sub: string;
  email: string | null;
  type: "app-session";
  iat: number;
  exp: number;
}

function encodeBase64Url(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buffer.toString("base64url");
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export class AppSessionService {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds = 8 * 60 * 60,
    private readonly nowMs: () => number = () => Date.now(),
  ) {
    if (!secret.trim()) {
      throw new Error("App session secret is required");
    }
  }

  createSession(user: AppSessionUser): AppSession {
    const issuedAtSeconds = Math.floor(this.nowMs() / 1000);
    const expiresAtSeconds = issuedAtSeconds + this.ttlSeconds;
    const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = encodeBase64Url(JSON.stringify({
      iss: "meatlens-app",
      sub: user.id,
      email: user.email,
      type: "app-session",
      iat: issuedAtSeconds,
      exp: expiresAtSeconds,
    } satisfies AppSessionPayload));
    const signature = this.sign(`${header}.${payload}`);

    return {
      access_token: `${header}.${payload}.${signature}`,
      refresh_token: null,
      token_type: "bearer",
      expires_in: this.ttlSeconds,
      expires_at: expiresAtSeconds,
    };
  }

  async getUserFromAccessToken(accessToken: string): Promise<AppSessionUser> {
    const trimmedToken = accessToken.trim();
    const parts = trimmedToken.split(".");

    if (parts.length !== 3) {
      throw new Error("Invalid or expired access token");
    }

    const [header, payload, signature] = parts;
    const expectedSignature = this.sign(`${header}.${payload}`);
    const actualSignature = Buffer.from(signature, "utf8");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

    if (
      actualSignature.length !== expectedSignatureBuffer.length ||
      !crypto.timingSafeEqual(actualSignature, expectedSignatureBuffer)
    ) {
      throw new Error("Invalid or expired access token");
    }

    let parsedPayload: AppSessionPayload;

    try {
      parsedPayload = JSON.parse(decodeBase64Url(payload)) as AppSessionPayload;
    } catch {
      throw new Error("Invalid or expired access token");
    }

    if (
      parsedPayload.iss !== "meatlens-app" ||
      parsedPayload.type !== "app-session" ||
      !parsedPayload.sub
    ) {
      throw new Error("Invalid or expired access token");
    }

    const currentSeconds = Math.floor(this.nowMs() / 1000);
    if (parsedPayload.exp <= currentSeconds) {
      throw new Error("Invalid or expired access token");
    }

    return {
      id: parsedPayload.sub,
      email: parsedPayload.email ?? null,
    };
  }

  looksLikeAppSessionToken(accessToken: string): boolean {
    const parts = accessToken.trim().split(".");
    if (parts.length !== 3) {
      return false;
    }

    try {
      const parsedPayload = JSON.parse(decodeBase64Url(parts[1])) as Partial<AppSessionPayload>;
      return parsedPayload.iss === "meatlens-app" && parsedPayload.type === "app-session";
    } catch {
      return false;
    }
  }

  private sign(input: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(input)
      .digest("base64url");
  }
}

let appSessionService: AppSessionService | null = null;

export function getAppSessionService(): AppSessionService {
  if (appSessionService) {
    return appSessionService;
  }

  const appSessionSecret = process.env.APP_SESSION_SECRET || process.env.SUPABASE_SERVICE_KEY || "";
  const appSessionTtlSeconds = Math.max(300, parseInt(process.env.APP_SESSION_TTL_SECONDS || "28800", 10));
  appSessionService = new AppSessionService(appSessionSecret, appSessionTtlSeconds);
  return appSessionService;
}
