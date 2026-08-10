import type { ProfileService } from "../infrastructure/ProfileService";
export class CheckUserRole {
  constructor(private readonly service: Pick<ProfileService, "hasRole">) {}
  execute(userId: string, role: string): Promise<boolean> { return this.service.hasRole(userId, role); }
}
