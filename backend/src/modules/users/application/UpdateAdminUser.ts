import type { AdminProfile, AdminUpdateUserInput, ProfileService } from "../infrastructure/ProfileService";
export class UpdateAdminUser {
  constructor(private readonly service: Pick<ProfileService, "updateUserByAdmin">) {}
  execute(userId: string, input: AdminUpdateUserInput): Promise<AdminProfile> { return this.service.updateUserByAdmin(userId, input); }
}
