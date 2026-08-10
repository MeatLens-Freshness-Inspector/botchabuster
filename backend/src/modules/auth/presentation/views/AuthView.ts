import type { AuthGatewayUser } from "../../domain/ports/AuthGateway";

export interface AuthUserView {
  id: string;
  email: string | null;
}

/** @final */
export class AuthView {
  private constructor() {}

  static user(user: AuthGatewayUser): AuthUserView {
    return {
      id: user.id,
      email: user.email,
    };
  }
}
