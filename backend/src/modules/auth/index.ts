/**
 * Auth module public surface.
 *
 * Concrete exports will be added as the legacy auth behavior is migrated.
 */
export {};

export { AuthToken } from "./domain/AuthToken";
export { SignInUser } from "./application/signIn/SignInUser";
export type { SignInUserInput } from "./application/signIn/SignInUser";
export type { AuthGateway, AuthGatewayUser } from "./domain/ports/AuthGateway";
export { AuthServiceGateway } from "./infrastructure/AuthServiceGateway";
export { SupabaseAuthOperations } from "./infrastructure/SupabaseAuthOperations";
export { createSupabaseAuthOperations } from "./infrastructure/SupabaseAuthFactory";
export type {
  AuthOperationHooks,
  AuthSession,
  AuthUser,
  SignInInput,
  SignUpInput,
} from "./infrastructure/SupabaseAuthOperations";
export {
  AppSessionService,
  getAppSessionService,
  resolveAppSessionConfig,
} from "./infrastructure/AppSessionService";
export type {
  AppSession,
  AppSessionMetadata,
  AppSessionUser,
} from "./infrastructure/AppSessionService";
export { CsrfTokenService } from "./infrastructure/CsrfTokenService";
export type { CsrfTokenInput } from "./infrastructure/CsrfTokenService";
export { PasskeyCeremonyStore, passkeyCeremonyStore } from "./infrastructure/PasskeyCeremonyStore";
export type {
  PasskeyCeremonyRecord,
  PasskeyCeremonyType,
} from "./infrastructure/PasskeyCeremonyStore";
export { SessionLimitService, getSessionLimitService } from "./infrastructure/SessionLimitService";
export { PasskeyService } from "./infrastructure/PasskeyService";
export { createSupabasePasskeyService } from "./infrastructure/SupabasePasskeyFactory";
export type { PasskeyDatabase, RegisteredPasskey } from "./infrastructure/PasskeyService";
export { AuthView } from "./presentation/views/AuthView";
export type { AuthUserView } from "./presentation/views/AuthView";
export { EmailService, emailService } from "./infrastructure/EmailService";
export type { MailTransport } from "./infrastructure/EmailService";
export { default as authRoutes } from "./presentation/routes";
export { AuthController } from "./presentation/controllers/AuthController";
