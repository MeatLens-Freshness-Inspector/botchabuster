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
export { AuthView } from "./presentation/views/AuthView";
export type { AuthUserView } from "./presentation/views/AuthView";
