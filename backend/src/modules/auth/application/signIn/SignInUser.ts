import { ValidationError } from "../../../../shared/domain/errors/ApplicationError";
import type { AuthGateway, AuthGatewayUser } from "../../domain/ports/AuthGateway";

export interface SignInUserInput {
  email: string;
  password: string;
}

export class SignInUser {
  constructor(private readonly authGateway: AuthGateway) {}

  async execute(input: SignInUserInput): Promise<AuthGatewayUser> {
    const email = input.email.trim();
    if (!email) {
      throw new ValidationError("Email is required");
    }

    if (!input.password) {
      throw new ValidationError("Password is required");
    }

    return this.authGateway.signIn(email, input.password);
  }
}
