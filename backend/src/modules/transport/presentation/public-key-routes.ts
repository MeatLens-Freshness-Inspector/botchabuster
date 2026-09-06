import { Router } from "express";
import type { TransportKeyStore } from "../infrastructure/TransportKeyStore";

export function createPublicKeyRouter(keyStore: TransportKeyStore): Router {
  const router = Router();
  router.get("/public-key", (_req, res) => {
    res.json(keyStore.publicKeyMetadata());
  });
  return router;
}
