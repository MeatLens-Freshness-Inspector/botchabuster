import { MANAGED_USER_ROLES, type ManagedRole } from "@/entities/user/api";
import { Input, Label } from "@/shared/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

type UserRoleFieldsProps = {
  isDeveloper: boolean;
  currentRole: ManagedRole;
  role: ManagedRole;
  rolePassword: string;
  onRoleChange: (role: ManagedRole) => void;
  onPasswordChange: (password: string) => void;
};

export function UserRoleFields({
  isDeveloper,
  currentRole,
  role,
  rolePassword,
  onRoleChange,
  onPasswordChange,
}: UserRoleFieldsProps) {
  if (!isDeveloper) return null;

  return (
    <>
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
          User Role
        </Label>
        <Select value={role} onValueChange={(value) => onRoleChange(value as ManagedRole)}>
          <SelectTrigger aria-label="User role" className="h-10 rounded-xl bg-background/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MANAGED_USER_ROLES.map((option) => (
              <SelectItem key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {role !== currentRole ? (
        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Developer Password
          </Label>
          <Input
            type="password"
            aria-label="Developer password"
            value={rolePassword}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Confirm your personal password"
            autoComplete="current-password"
            className="h-10 rounded-xl"
          />
        </div>
      ) : null}
    </>
  );
}
