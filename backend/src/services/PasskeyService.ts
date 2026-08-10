/** @deprecated Compatibility facade. */
export { PasskeyService } from "../modules/auth/infrastructure/PasskeyService";
export type { RegisteredPasskey } from "../modules/auth/infrastructure/PasskeyService";
import { createSupabasePasskeyService } from "../modules/auth/infrastructure/SupabasePasskeyFactory";
export const passkeyService = createSupabasePasskeyService();
