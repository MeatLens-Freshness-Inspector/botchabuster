import { supabase } from "../../../integrations/supabase";
import type { ReportOrganization } from "../../../types/reportOrganization";
import {
  MANAGED_ROLES,
  type AdminUserRoleChange,
  type ManagedRole,
} from "../application/ChangeAdminUserRole";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  inspector_code: string | null;
  report_organization: ReportOrganization | null;
  is_dark_mode: boolean | null;
  show_detailed_results: boolean | null;
  onboarding_completed_at: string | null;
  onboarding_version: number;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminProfile extends Profile {
  email: string | null;
  role: ManagedRole | null;
}

export type AppRole = "developer" | "admin" | "moderator" | "user";
export type PrimaryRole = "developer" | "admin" | "inspector";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface PrivilegeSummary {
  roles: AppRole[];
  primaryRole: PrimaryRole;
  isAdmin: boolean;
  isDeveloper: boolean;
}

export interface AdminCreateUserInput {
  email: string;
  password: string;
  full_name?: string | null;
  avatar_url?: string | null;
  inspector_code?: string | null;
  report_organization?: ReportOrganization | null;
  location?: string | null;
}

const ROLE_PRIORITY: AppRole[] = ["developer", "admin", "moderator", "user"];
const MANAGED_ROLE_PRIORITY: ManagedRole[] = ["developer", "admin", "user"];
const PROFILE_COLUMNS = "id, full_name, avatar_url, inspector_code, report_organization, is_dark_mode, show_detailed_results, onboarding_completed_at, onboarding_version, location, created_at, updated_at";

function isAppRole(value: string): value is AppRole {
  return ROLE_PRIORITY.includes(value as AppRole);
}

function resolveManagedRole(roles: UserRole[]): ManagedRole | null {
  return MANAGED_ROLE_PRIORITY.find((role) => roles.some((entry) => entry.role === role)) ?? null;
}

export interface AdminUpdateUserInput {
  email?: string;
  password?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  inspector_code?: string | null;
  report_organization?: ReportOrganization | null;
  location?: string | null;
}

export class ProfileService {
  private static instance: ProfileService;

  private constructor() {}

  static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
    return data as unknown as Profile | null;
  }

  async updateProfile(
    userId: string,
    updates: Partial<
      Pick<
        Profile,
        "full_name" | "avatar_url" | "location" | "report_organization" | "is_dark_mode" | "show_detailed_results" | "onboarding_completed_at"
      >
    >
  ): Promise<Profile> {
    const payload: Record<string, unknown> = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    if (updates.full_name !== undefined) payload.full_name = updates.full_name;
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.report_organization !== undefined) payload.report_organization = updates.report_organization;
    if (updates.is_dark_mode !== undefined) payload.is_dark_mode = updates.is_dark_mode;
    if (updates.show_detailed_results !== undefined) payload.show_detailed_results = updates.show_detailed_results;
    if (updates.onboarding_completed_at !== undefined) payload.onboarding_completed_at = updates.onboarding_completed_at;

    const { data, error } = await (supabase
      .from("profiles") as any)
      .upsert(payload, { onConflict: "id" })
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return data as unknown as Profile;
  }

  private async listAllAuthUsers(): Promise<Array<{ id: string; email: string | null }>> {
    const users: Array<{ id: string; email: string | null }> = [];
    const perPage = 200;
    let page = 1;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(`Failed to fetch auth users: ${error.message}`);

      const batch = data?.users ?? [];
      users.push(...batch.map((user) => ({ id: user.id, email: user.email ?? null })));

      if (batch.length < perPage) break;
      page += 1;
    }

    return users;
  }

  async getAllProfiles(): Promise<AdminProfile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(2_000);
    if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);

    const profiles = (data as unknown as Profile[]) ?? [];
    const profileIds = profiles.map((profile) => profile.id);
    const rolesByUserId = new Map<string, UserRole[]>();

    if (profileIds.length > 0) {
      const { data: roleData, error: roleError } = await (supabase
        .from("user_roles") as any)
        .select("id, user_id, role")
        .in("user_id", profileIds);
      if (roleError) throw new Error(`Failed to fetch profile roles: ${roleError.message}`);

      for (const role of (roleData as UserRole[] | null) ?? []) {
        const userRoles = rolesByUserId.get(role.user_id) ?? [];
        userRoles.push(role);
        rolesByUserId.set(role.user_id, userRoles);
      }
    }

    const authUsers = await this.listAllAuthUsers();
    const emailByUserId = new Map(authUsers.map((authUser) => [authUser.id, authUser.email]));

    return profiles.map((profile) => ({
      ...profile,
      email: emailByUserId.get(profile.id) ?? null,
      role: resolveManagedRole(rolesByUserId.get(profile.id) ?? []),
    }));
  }

  async createUserByAdmin(input: AdminCreateUserInput): Promise<AdminProfile> {
    const fullName = input.full_name?.trim() || null;
    const inspectorCode = input.inspector_code?.trim() || null;
    const reportOrganization = input.report_organization ?? null;
    const location = input.location?.trim() || null;
    const avatarUrl = input.avatar_url?.trim() || null;

    const { data: createdAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email: input.email.trim(),
      password: input.password,
      email_confirm: true,
      user_metadata: {
        ...(fullName ? { full_name: fullName } : {}),
        ...(inspectorCode ? { access_code: inspectorCode } : {}),
        ...(reportOrganization ? { report_organization: reportOrganization } : {}),
      },
    });

    if (createAuthError) throw new Error(`Failed to create user: ${createAuthError.message}`);

    const createdUserId = createdAuthUser.user?.id;
    if (!createdUserId) throw new Error("Failed to create user: missing user ID");

    const { data: profileData, error: profileError } = await (supabase
      .from("profiles") as any)
      .upsert({
        id: createdUserId,
        full_name: fullName,
        inspector_code: inspectorCode,
        report_organization: reportOrganization,
        location,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      .select(PROFILE_COLUMNS)
      .single();

    if (profileError) {
      await supabase.auth.admin.deleteUser(createdUserId);
      throw new Error(`Failed to update created profile: ${profileError.message}`);
    }

    return {
      ...(profileData as Profile),
      email: createdAuthUser.user?.email ?? input.email.trim(),
      role: await this.getManagedRole(createdUserId),
    };
  }

  async updateUserByAdmin(userId: string, input: AdminUpdateUserInput): Promise<AdminProfile> {
    const shouldUpdateMetadata =
      input.full_name !== undefined ||
      input.inspector_code !== undefined ||
      input.report_organization !== undefined;
    const authUserPatch: {
      email?: string;
      password?: string;
      user_metadata?: Record<string, unknown>;
    } = {};

    let updatedEmail: string | null = null;

    if (input.email !== undefined) {
      authUserPatch.email = input.email.trim();
      updatedEmail = input.email.trim();
    }

    if (input.password !== undefined) {
      authUserPatch.password = input.password;
    }

    if (shouldUpdateMetadata) {
      const { data: existingAuthUser, error: existingAuthUserError } = await supabase.auth.admin.getUserById(userId);
      if (existingAuthUserError) throw new Error(`Failed to fetch auth user: ${existingAuthUserError.message}`);

      const currentMetadata = { ...(existingAuthUser.user?.user_metadata ?? {}) } as Record<string, unknown>;

      if (input.full_name !== undefined) {
        const fullName = input.full_name?.trim() || null;
        if (fullName) currentMetadata.full_name = fullName;
        else delete currentMetadata.full_name;
      }

      if (input.inspector_code !== undefined) {
        const inspectorCode = input.inspector_code?.trim() || null;
        if (inspectorCode) currentMetadata.access_code = inspectorCode;
        else delete currentMetadata.access_code;
      }

      if (input.report_organization !== undefined) {
        if (input.report_organization) {
          currentMetadata.report_organization = input.report_organization;
        } else {
          delete currentMetadata.report_organization;
        }
      }

      authUserPatch.user_metadata = currentMetadata;
    }

    if (Object.keys(authUserPatch).length > 0) {
      const { data: updatedAuthUser, error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, authUserPatch);
      if (updateAuthError) throw new Error(`Failed to update auth user: ${updateAuthError.message}`);
      updatedEmail = updatedAuthUser.user?.email ?? updatedEmail;
    }

    const profilePatch: Partial<
      Pick<Profile, "full_name" | "avatar_url" | "inspector_code" | "report_organization" | "location">
    > = {};

    if (input.full_name !== undefined) profilePatch.full_name = input.full_name?.trim() || null;
    if (input.avatar_url !== undefined) profilePatch.avatar_url = input.avatar_url?.trim() || null;
    if (input.inspector_code !== undefined) profilePatch.inspector_code = input.inspector_code?.trim() || null;
    if (input.report_organization !== undefined) profilePatch.report_organization = input.report_organization ?? null;
    if (input.location !== undefined) profilePatch.location = input.location?.trim() || null;

    let updatedProfile: Profile | null = null;

    if (Object.keys(profilePatch).length > 0) {
      const updatePayload = { ...profilePatch, updated_at: new Date().toISOString() };
      const { data: profileData, error: profileError } = await (supabase
        .from("profiles") as any)
        .update(updatePayload)
        .eq("id", userId)
        .select(PROFILE_COLUMNS)
        .maybeSingle();

      if (profileError) throw new Error(`Failed to update profile: ${profileError.message}`);

      if (profileData) {
        updatedProfile = profileData as Profile;
      } else {
        // Backward-compatible fallback for legacy rows that fail to return from
        // UPDATE (e.g., missing profile row): ensure the profile exists via upsert.
        const { data: upsertedProfileData, error: upsertProfileError } = await (supabase
          .from("profiles") as any)
          .upsert({
            id: userId,
            ...updatePayload,
          }, { onConflict: "id" })
          .select(PROFILE_COLUMNS)
          .single();

        if (upsertProfileError) throw new Error(`Failed to update profile: ${upsertProfileError.message}`);
        updatedProfile = upsertedProfileData as Profile;
      }
    } else {
      updatedProfile = await this.getProfile(userId);
    }

    if (!updatedProfile) throw new Error("Failed to fetch updated profile");

    if (updatedEmail === null) {
      const { data: refreshedAuthUser, error: refreshedAuthUserError } = await supabase.auth.admin.getUserById(userId);
      if (refreshedAuthUserError) throw new Error(`Failed to fetch updated auth user: ${refreshedAuthUserError.message}`);
      updatedEmail = refreshedAuthUser.user?.email ?? null;
    }

    return {
      ...updatedProfile,
      email: updatedEmail,
      role: await this.getManagedRole(userId),
    };
  }

  async deleteUserByAdmin(userId: string): Promise<void> {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Failed to delete user: ${error.message}`);
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from("user_roles")
      .select("id, user_id, role")
      .eq("user_id", userId);
    if (error) throw new Error(`Failed to fetch roles: ${error.message}`);
    return (data as unknown as UserRole[]) ?? [];
  }

  async getManagedRole(userId: string): Promise<ManagedRole | null> {
    return resolveManagedRole(await this.getUserRoles(userId));
  }

  async changeUserRoleByAdmin(userId: string, role: ManagedRole): Promise<AdminUserRoleChange> {
    const currentRoles = await this.getUserRoles(userId);
    const previousRole = resolveManagedRole(currentRoles);

    const { error: deleteError } = await (supabase.from("user_roles") as any)
      .delete()
      .eq("user_id", userId)
      .in("role", MANAGED_ROLES);
    if (deleteError) throw new Error(`Failed to replace user role: ${deleteError.message}`);

    const { error: insertError } = await (supabase.from("user_roles") as any)
      .insert({ user_id: userId, role });
    if (insertError) throw new Error(`Failed to assign user role: ${insertError.message}`);

    return { previousRole, role };
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    if (!isAppRole(role)) {
      return false;
    }

    const roles = await this.getUserRoles(userId);
    return roles.some((r) => r.role === role);
  }

  async getPrivilegeSummary(userId: string): Promise<PrivilegeSummary> {
    const roles = (await this.getUserRoles(userId))
      .map((entry) => entry.role)
      .filter((role): role is AppRole => isAppRole(role))
      .filter((role, index, list) => list.indexOf(role) === index)
      .sort((left, right) => ROLE_PRIORITY.indexOf(left) - ROLE_PRIORITY.indexOf(right));

    const isDeveloper = roles.includes("developer");
    const isAdmin = isDeveloper || roles.includes("admin");
    const primaryRole: PrimaryRole = isDeveloper ? "developer" : isAdmin ? "admin" : "inspector";

    return {
      roles,
      primaryRole,
      isAdmin,
      isDeveloper,
    };
  }

  async getUserStats(): Promise<{
    total_users: number;
    total_inspections: number;
    roles: { role: string; count: number }[] | null;
  }> {
    const { data, error } = await supabase.rpc("get_user_stats");
    if (error) throw new Error(`Failed to fetch stats: ${error.message}`);
    return data as any;
  }
}

export const profileService = ProfileService.getInstance();
