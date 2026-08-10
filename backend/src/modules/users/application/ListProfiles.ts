import type { AdminProfile, ProfileService } from "../infrastructure/ProfileService";
export class ListProfiles {
  constructor(private readonly service: Pick<ProfileService, "getAllProfiles">) {}
  execute(): Promise<AdminProfile[]> { return this.service.getAllProfiles(); }
}
