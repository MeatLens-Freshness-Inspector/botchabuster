import type { UserProfile, UserRepository } from "../domain/ports/UserRepository";

interface LegacyProfileService {
  getProfile(userId: string): Promise<Record<string, unknown> & {
    id: string;
    full_name: string | null;
  } | null>;
}

export class ProfileServiceGateway implements UserRepository {
  constructor(private readonly legacyProfileService: LegacyProfileService) {}

  async getProfile(userId: string): Promise<UserProfile | null> {
    const profile = await this.legacyProfileService.getProfile(userId);
    if (!profile) return null;

    return {
      ...profile,
      email: typeof profile.email === "string" ? profile.email : null,
    };
  }
}
