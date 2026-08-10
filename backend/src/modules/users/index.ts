/** Users module public surface. */
export {};

export { UserId } from "./domain/UserId";
export { GetProfile } from "./application/GetProfile";
export { ListProfiles } from "./application/ListProfiles";
export { UpdateProfile } from "./application/UpdateProfile";
export { GetUserStats } from "./application/GetUserStats";
export { CheckUserRole } from "./application/CheckUserRole";
export { CreateAdminUser } from "./application/CreateAdminUser";
export { UpdateAdminUser } from "./application/UpdateAdminUser";
export { DeleteAdminUser } from "./application/DeleteAdminUser";
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
