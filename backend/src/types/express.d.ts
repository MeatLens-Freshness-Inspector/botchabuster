import type { RequestAuthContext } from "../middleware/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: RequestAuthContext;
    }
  }
}

export {};
