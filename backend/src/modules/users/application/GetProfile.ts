import { NotFoundError } from "../../../shared/domain/errors/ApplicationError";
import { UserId } from "../domain/UserId";
import type { UserProfile, UserRepository } from "../domain/ports/UserRepository";

export class GetProfile {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(rawUserId: string): Promise<UserProfile> {
    const userId = UserId.create(rawUserId);
    const profile = await this.userRepository.getProfile(userId.value);
    if (!profile) {
      throw new NotFoundError("Profile");
    }

    return profile;
  }
}
