/** @deprecated Import the auth module session component instead. */
export {
  AppSessionService,
  getAppSessionService,
  resolveAppSessionConfig,
} from "../modules/auth/infrastructure/AppSessionService";
export type {
  AppSession,
  AppSessionMetadata,
  AppSessionUser,
} from "../modules/auth/infrastructure/AppSessionService";
