import { Request, Response } from "express";
import { profileService } from "../../infrastructure/ProfileService";
import { auditLogService } from "../../../audit/infrastructure/AuditLogService";
import { isReportOrganization } from "../../../../types/reportOrganization";
import { getRequestAuthContext, resolveTrackedRequestAuthContext, toAuditActor } from "../../../../middleware/auth";
import { ListProfiles } from "../../application/ListProfiles";
import { UpdateProfile } from "../../application/UpdateProfile";
import { GetUserStats } from "../../application/GetUserStats";
import { CheckUserRole } from "../../application/CheckUserRole";
import { CreateAdminUser } from "../../application/CreateAdminUser";
import { UpdateAdminUser } from "../../application/UpdateAdminUser";
import { DeleteAdminUser } from "../../application/DeleteAdminUser";

export class ProfileController {
  private readonly listProfiles = new ListProfiles(profileService);
  private readonly updateProfileUseCase = new UpdateProfile(profileService);
  private readonly getUserStatsUseCase = new GetUserStats(profileService);
  private readonly checkUserRoleUseCase = new CheckUserRole(profileService);
  private readonly createAdminUser = new CreateAdminUser(profileService);
  private readonly updateAdminUser = new UpdateAdminUser(profileService);
  private readonly deleteAdminUser = new DeleteAdminUser(profileService);
  private async resolveActor(req: Request): Promise<{ id: string; role: string } | null> {
    try {
      const authContext = req.auth ?? getRequestAuthContext(req);
      return toAuditActor(authContext);
    } catch {
      try {
        const authContext = await resolveTrackedRequestAuthContext(req);
        return toAuditActor(authContext);
      } catch {
        return null;
      }
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }
      const profile = await profileService.getProfile(id);
      res.json(profile);
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch profile" });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        full_name,
        avatar_url,
        location,
        is_dark_mode,
        show_detailed_results,
        onboarding_completed_at,
      } = req.body;
      if (!id) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      if (is_dark_mode !== undefined && typeof is_dark_mode !== "boolean") {
        res.status(400).json({ error: "is_dark_mode must be a boolean" });
        return;
      }

      if (show_detailed_results !== undefined && typeof show_detailed_results !== "boolean") {
        res.status(400).json({ error: "show_detailed_results must be a boolean" });
        return;
      }

      if (
        onboarding_completed_at !== undefined &&
        onboarding_completed_at !== null &&
        (typeof onboarding_completed_at !== "string" || Number.isNaN(Date.parse(onboarding_completed_at)))
      ) {
        res.status(400).json({ error: "onboarding_completed_at must be null or an ISO timestamp string" });
        return;
      }

      const profile = await this.updateProfileUseCase.execute(id, {
        full_name,
        avatar_url,
        location,
        is_dark_mode,
        show_detailed_results,
        onboarding_completed_at,
      });
      res.json(profile);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update profile" });
    }
  }

  async getAllProfiles(req: Request, res: Response): Promise<void> {
    try {
      const profiles = await this.listProfiles.execute();
      res.json(profiles);
    } catch (error) {
      console.error("Get all profiles error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch profiles" });
    }
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.getUserStatsUseCase.execute();
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch stats" });
    }
  }

  async checkUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId, role } = req.params;
      if (!userId || !role) {
        res.status(400).json({ error: "User ID and role are required" });
        return;
      }
      const hasRole = await this.checkUserRoleUseCase.execute(userId, role);
      res.json({ hasRole });
    } catch (error) {
      console.error("Check user role error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to check user role" });
    }
  }

  async createUserByAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, full_name, inspector_code, report_organization, location, avatar_url } = req.body as {
        email?: string;
        password?: string;
        full_name?: string | null;
        inspector_code?: string | null;
        report_organization?: string | null;
        location?: string | null;
        avatar_url?: string | null;
      };

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      if (
        report_organization !== undefined &&
        report_organization !== null &&
        !isReportOrganization(report_organization)
      ) {
        res.status(400).json({
          error: "report_organization must be one of: dti, city_veterinary_office_olongapo, gordon_college_ccs",
        });
        return;
      }

      const createdUser = await this.createAdminUser.execute({
        email,
        password,
        full_name,
        inspector_code,
        report_organization: report_organization ?? null,
        location,
        avatar_url,
      });

      const actor = await this.resolveActor(req);
      if (actor) {
        await auditLogService.write({
          payload: {
            event_type: "admin.user.create",
            event_time: new Date().toISOString(),
            actor: {
              id: actor.id,
              role: actor.role,
            },
            source: {
              ip: req.ip || null,
              user_agent: req.header("user-agent") || null,
            },
            data: {
              user_id: createdUser.id,
              email: createdUser.email,
              inspector_code: createdUser.inspector_code,
              report_organization: createdUser.report_organization,
              location: createdUser.location,
            },
          },
        });
      }

      res.status(201).json(createdUser);
    } catch (error) {
      console.error("Create user by admin error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create user" });
    }
  }

  async updateUserByAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      const { email, password, full_name, inspector_code, report_organization, location, avatar_url } = req.body as {
        email?: string;
        password?: string;
        full_name?: string | null;
        inspector_code?: string | null;
        report_organization?: string | null;
        location?: string | null;
        avatar_url?: string | null;
      };

      if (password !== undefined && password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      if (
        report_organization !== undefined &&
        report_organization !== null &&
        !isReportOrganization(report_organization)
      ) {
        res.status(400).json({
          error: "report_organization must be one of: dti, city_veterinary_office_olongapo, gordon_college_ccs",
        });
        return;
      }

      const updatedUser = await this.updateAdminUser.execute(id, {
        email,
        password,
        full_name,
        inspector_code,
        report_organization: report_organization ?? undefined,
        location,
        avatar_url,
      });

      const actor = await this.resolveActor(req);
      if (actor) {
        const changedFields = [
          email !== undefined ? "email" : null,
          password !== undefined ? "password" : null,
          full_name !== undefined ? "full_name" : null,
          inspector_code !== undefined ? "inspector_code" : null,
          report_organization !== undefined ? "report_organization" : null,
          location !== undefined ? "location" : null,
          avatar_url !== undefined ? "avatar_url" : null,
        ].filter(Boolean);

        await auditLogService.write({
          payload: {
            event_type: "admin.user.update",
            event_time: new Date().toISOString(),
            actor: {
              id: actor.id,
              role: actor.role,
            },
            source: {
              ip: req.ip || null,
              user_agent: req.header("user-agent") || null,
            },
            data: {
              user_id: updatedUser.id,
              changed_fields: changedFields,
              report_organization: updatedUser.report_organization,
            },
          },
        });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Update user by admin error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update user" });
    }
  }

  async deleteUserByAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      await this.deleteAdminUser.execute(id);

      const actor = await this.resolveActor(req);
      if (actor) {
        await auditLogService.write({
          payload: {
            event_type: "admin.user.delete",
            event_time: new Date().toISOString(),
            actor: {
              id: actor.id,
              role: actor.role,
            },
            source: {
              ip: req.ip || null,
              user_agent: req.header("user-agent") || null,
            },
            data: {
              user_id: id,
            },
          },
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete user by admin error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete user" });
    }
  }
}
