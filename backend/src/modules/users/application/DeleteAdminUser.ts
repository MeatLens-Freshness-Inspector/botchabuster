import type { ProfileService } from "../infrastructure/ProfileService";
export class DeleteAdminUser {
  constructor(private readonly service: Pick<ProfileService, "deleteUserByAdmin">) {}
  execute(userId: string): Promise<void> { return this.service.deleteUserByAdmin(userId); }
}
