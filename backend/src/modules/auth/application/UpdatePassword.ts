export interface PasswordUpdateGateway { updatePassword(userId: string, password: string): Promise<void>; }
export class UpdatePassword {
  constructor(private readonly gateway: PasswordUpdateGateway) {}
  execute(userId: string, password: string): Promise<void> { return this.gateway.updatePassword(userId, password); }
}
