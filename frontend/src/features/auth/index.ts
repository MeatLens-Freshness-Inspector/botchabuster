export {
  InactivityGuard,
  type InactivityGuardProps,
} from "./ui/inactivity-guard";
export {
  AuthClient,
  authClient,
  type AuthBootstrapPayload,
  type AuthPrimaryRole,
  type AuthRole,
  type AuthSession,
  type AuthUser,
} from "./api";
export {
  getAuthDestination,
  getErrorMessage,
  getLoginDescription,
} from "./model/login";
export { useLoginPage, type LoginAuthActions } from "./model/use-login";
export {
  validateSignupState,
  getErrorMessage as getSignupErrorMessage,
} from "./model/signup";
export { useSignupPage, type SignupWorkflowDependencies } from "./model/use-signup";
