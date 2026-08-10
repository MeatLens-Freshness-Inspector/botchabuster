import type { AccessCode } from "../infrastructure/AccessCodeService";
export interface AccessCodeCreator { create(code: string, description?: string, createdBy?: string): Promise<AccessCode>; }
export class CreateAccessCode {
  constructor(private readonly creator: AccessCodeCreator) {}
  execute(input: { code: string; description?: string; createdBy?: string }): Promise<AccessCode> {
    return this.creator.create(input.code, input.description, input.createdBy);
  }
}
