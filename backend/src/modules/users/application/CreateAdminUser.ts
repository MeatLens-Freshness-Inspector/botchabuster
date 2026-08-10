import type { AdminCreateUserInput, AdminProfile, ProfileService } from "../infrastructure/ProfileService";
export class CreateAdminUser {
  constructor(private readonly service: Pick<ProfileService, "createUserByAdmin">) {}
  execute(input: AdminCreateUserInput): Promise<AdminProfile> { return this.service.createUserByAdmin(input); }
}
