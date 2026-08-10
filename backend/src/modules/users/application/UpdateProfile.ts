import type { Profile, ProfileService } from "../infrastructure/ProfileService";
export class UpdateProfile {
  constructor(private readonly service: Pick<ProfileService, "updateProfile">) {}
  execute(userId: string, updates: Parameters<ProfileService["updateProfile"]>[1]): Promise<Profile> {
    return this.service.updateProfile(userId, updates);
  }
}
