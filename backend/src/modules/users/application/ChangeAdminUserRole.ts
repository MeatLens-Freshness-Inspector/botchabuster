import type { AuthGateway } from "../../auth/domain/ports/AuthGateway";
import { AuthenticationError } from "../../../shared/domain/errors/ApplicationError";

export const MANAGED_ROLES = ["user", "admin", "developer"] as const;
export type ManagedRole = (typeof MANAGED_ROLES)[number];

export interface AdminUserRoleChange {
  previousRole: ManagedRole | null;
  role: ManagedRole;
}

export function isManagedRole(value: unknown): value is ManagedRole {
  return typeof value === "string" && MANAGED_ROLES.includes(value as ManagedRole);
}

export interface AdminUserRoleService {
  changeUserRoleByAdmin(userId: string, role: ManagedRole): Promise<AdminUserRoleChange>;
}

export interface AuditWriter {
  write(event: { payload: Record<string, unknown> }): Promise<void>;
}

export interface RoleChangeActor {
  id: string;
  email: string | null;
  role: string;
}

export interface ChangeAdminUserRoleInput {
  targetUserId: string;
  role: ManagedRole;
  password: string;
  actor: RoleChangeActor;
  source: {
    ip: string | null;
    userAgent: string | null;
  };
}

export class ChangeAdminUserRole {
  constructor(
    private readonly roleService: AdminUserRoleService,
    private readonly passwordVerifier: AuthGateway,
    private readonly auditWriter: AuditWriter,
  ) {}

  async execute(input: ChangeAdminUserRoleInput): Promise<AdminUserRoleChange> {
    const targetUserId = input.targetUserId.trim();
    if (!targetUserId) {
      throw new Error("Target user ID is required");
    }

    if (!isManagedRole(input.role)) {
      throw new Error("Role must be one of: user, admin, developer");
    }

    if (input.actor.role !== "developer") {
      throw new Error("Developer access required");
    }

    if (!input.actor.id.trim() || !input.actor.email?.trim()) {
      throw new AuthenticationError("Developer password is incorrect");
    }

    if (!input.password.trim()) {
      throw new AuthenticationError("Developer password is incorrect");
    }

    let verifiedUser: Awaited<ReturnType<AuthGateway["signIn"]>>;
    try {
      verifiedUser = await this.passwordVerifier.signIn(input.actor.email.trim(), input.password);
    } catch {
      throw new AuthenticationError("Developer password is incorrect");
    }

    if (verifiedUser.id !== input.actor.id) {
      throw new AuthenticationError("Developer password is incorrect");
    }

    const change = await this.roleService.changeUserRoleByAdmin(targetUserId, input.role);

    await this.auditWriter.write({
      payload: {
        event_type: "admin.user.role_change",
        event_time: new Date().toISOString(),
        actor: {
          id: input.actor.id,
          role: "developer",
        },
        source: {
          ip: input.source.ip,
          user_agent: input.source.userAgent,
        },
        data: {
          user_id: targetUserId,
          previous_role: change.previousRole,
          new_role: change.role,
        },
      },
    });

    return change;
  }
}
