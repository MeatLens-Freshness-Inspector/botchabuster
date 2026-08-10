/** Access-codes module public surface. */
export { AccessCodeService, accessCodeService } from "./infrastructure/AccessCodeService";
export type { AccessCode } from "./infrastructure/AccessCodeService";
export { default as accessCodeRoutes } from "./presentation/routes";
export { AccessCodeController } from "./presentation/controllers/AccessCodeController";
