import type { AccessCode } from "../infrastructure/AccessCodeService";
export interface AccessCodeToggler { toggleActive(id: string, isActive: boolean): Promise<AccessCode>; }
export class ToggleAccessCode {
  constructor(private readonly toggler: AccessCodeToggler) {}
  execute(input: { id: string; isActive: boolean }): Promise<AccessCode> {
    return this.toggler.toggleActive(input.id, input.isActive);
  }
}
