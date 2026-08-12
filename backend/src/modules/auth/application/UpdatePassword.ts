export interface PasswordUpdateGateway {
  updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}

export class UpdatePassword {
  constructor(private readonly gateway: PasswordUpdateGateway) {}

  execute(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    return this.gateway.updatePassword(userId, currentPassword, newPassword);
  }
}
