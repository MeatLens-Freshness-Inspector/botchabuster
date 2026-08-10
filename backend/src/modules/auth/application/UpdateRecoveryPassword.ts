export interface RecoveryPasswordGateway { updatePasswordWithRecoveryToken(accessToken: string, password: string): Promise<void>; }
export class UpdateRecoveryPassword {
  constructor(private readonly gateway: RecoveryPasswordGateway) {}
  execute(accessToken: string, password: string): Promise<void> { return this.gateway.updatePasswordWithRecoveryToken(accessToken, password); }
}
