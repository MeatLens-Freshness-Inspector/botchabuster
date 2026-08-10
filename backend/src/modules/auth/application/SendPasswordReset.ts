export interface PasswordResetGateway { sendPasswordReset(email: string, redirectTo?: string): Promise<void>; }
export class SendPasswordReset {
  constructor(private readonly gateway: PasswordResetGateway) {}
  execute(email: string, redirectTo?: string): Promise<void> { return this.gateway.sendPasswordReset(email, redirectTo); }
}
