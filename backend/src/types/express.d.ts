import type { RequestAuthContext } from "../middleware/auth";
import type { DecodedTransportFile, TransportContext } from "../modules/transport/domain/transport";

declare global {
  namespace Express {
    interface Request {
      auth?: RequestAuthContext;
      authAccessToken?: string;
      authAccessTokenSource?: "bearer" | "cookie";
      authContextResolved?: boolean;
      transportContext?: TransportContext;
      transportBody?: Buffer;
      transportFiles?: Record<string, DecodedTransportFile>;
    }
  }
}

export {};
