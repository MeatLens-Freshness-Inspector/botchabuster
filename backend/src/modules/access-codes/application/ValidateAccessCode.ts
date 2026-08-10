export interface AccessCodeValidator { validate(code: string): Promise<boolean>; }
export class ValidateAccessCode {
  constructor(private readonly validator: AccessCodeValidator) {}
  execute(code: string): Promise<boolean> { return this.validator.validate(code); }
}
