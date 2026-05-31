import { Request, Response } from "express";
import { profileService } from "../services/ProfileService";
import { authService } from "../services/AuthService";
import { auditLogService } from "../services/AuditLogService";

export class ProfileController {
  private async resolveActor(req: Request): Promise<{ id: string; role: string } | null> {
    const authorizationHeader = req.header("authorization");
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return null;
    }

    const accessToken = authorizationHeader.slice("Bearer ".length).trim();
    if (!accessToken) return null;

    try {
      const user = await authService.getUserByAccessToken(accessToken);
      const isAdmin = await profileService.hasRole(user.id, "admin");
      return { id: user.id, role: isAdmin ? "admin" : "inspector" };
    } catch {
      return null;
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

      const profile = await profileService.updateProfile(id, {
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
      const profiles = await profileService.getAllProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Get all profiles error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch profiles" });
    }
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await profileService.getUserStats();
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
      const hasRole = await profileService.hasRole(userId, role);
      res.json({ hasRole });
    } catch (error) {
      console.error("Check user role error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to check user role" });
    }
  }

  async createUserByAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, full_name, inspector_code, location, avatar_url } = req.body as {
        email?: string;
        password?: string;
        full_name?: string | null;
        inspector_code?: string | null;
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

      const createdUser = await profileService.createUserByAdmin({
        email,
        password,
        full_name,
        inspector_code,
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

      const { email, password, full_name, inspector_code, location, avatar_url } = req.body as {
        email?: string;
        password?: string;
        full_name?: string | null;
        inspector_code?: string | null;
        location?: string | null;
        avatar_url?: string | null;
      };

      if (password !== undefined && password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      const updatedUser = await profileService.updateUserByAdmin(id, {
        email,
        password,
        full_name,
        inspector_code,
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

      await profileService.deleteUserByAdmin(id);

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
