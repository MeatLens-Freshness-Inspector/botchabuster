import type { UserProfile } from "../../domain/ports/UserRepository";

/** @final */
export class UserView {
  private constructor() {}

  static profile(profile: UserProfile): UserProfile {
    return { ...profile };
  }
}
