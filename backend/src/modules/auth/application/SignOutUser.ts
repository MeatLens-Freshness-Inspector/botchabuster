export interface SignOutGateway { signOut(): Promise<void>; }
export class SignOutUser {
  constructor(private readonly gateway: SignOutGateway) {}
  execute(): Promise<void> { return this.gateway.signOut(); }
}
