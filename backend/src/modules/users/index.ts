/** Users module public surface. */
export {};

export { UserId } from "./domain/UserId";
export { GetProfile } from "./application/GetProfile";
export type { UserProfile, UserRepository } from "./domain/ports/UserRepository";
export { ProfileServiceGateway } from "./infrastructure/ProfileServiceGateway";
export { ProfileService, profileService } from "./infrastructure/ProfileService";
export type {
  AdminCreateUserInput,
  AdminProfile,
  AdminUpdateUserInput,
  AppRole,
  PrimaryRole,
  Profile,
  PrivilegeSummary,
  UserRole,
} from "./infrastructure/ProfileService";
export { GetProfileController } from "./presentation/controllers/GetProfileController";
export { UserView } from "./presentation/views/UserView";
export { default as profileRoutes } from "./presentation/routes";
export { ProfileController } from "./presentation/controllers/ProfileController";
