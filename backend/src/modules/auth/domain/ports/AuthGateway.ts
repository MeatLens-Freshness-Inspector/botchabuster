export interface AuthGatewayUser {
  id: string;
  email: string | null;
}

export interface AuthGateway {
  signIn(email: string, password: string): Promise<AuthGatewayUser>;
}
