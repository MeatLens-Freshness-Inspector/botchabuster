import { format } from "date-fns";
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  REPORT_ORGANIZATION_OPTIONS,
  getReportOrganizationLabel,
  type ReportOrganization,
} from "@/lib/reportOrganizations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type UsersTabContentProps = {
  dashboard: AdminDashboardPageViewModel;
};

const UsersTabContent = ({ dashboard }: UsersTabContentProps) => {
  const {
    user,
    userForm,
    editingUserId,
    isSavingUser,
    profiles,
    setUserForm,
    resetUserForm,
    handleStartEditUser,
    handleSubmitUserForm,
    handleDeleteUser,
  } = dashboard;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
            <UserPlus className="h-4 w-4" />
            {editingUserId ? "Edit User" : "Add User"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Full Name
            </Label>
            <Input
              value={userForm.full_name}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, full_name: event.target.value }))
              }
              placeholder="Juan dela Cruz"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Email
            </Label>
            <Input
              type="email"
              value={userForm.email}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="inspector@example.com"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              {editingUserId ? "New Password (Optional)" : "Password"}
            </Label>
            <Input
              type="password"
              value={userForm.password}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder={
                editingUserId
                  ? "Leave blank to keep current password"
                  : "At least 6 characters"
              }
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Inspector Code
            </Label>
            <Input
              value={userForm.inspector_code}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  inspector_code: event.target.value,
                }))
              }
              placeholder="INSPECTOR-2026"
              className="h-10 rounded-xl font-display tracking-wider"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Report Header Organization
            </Label>
            <Select
              value={userForm.report_organization || undefined}
              onValueChange={(value) =>
                setUserForm((prev) => ({
                  ...prev,
                  report_organization: value as ReportOrganization,
                }))
              }
            >
              <SelectTrigger
                aria-label="Report header organization"
                className="h-10 rounded-xl bg-background/80"
              >
                <SelectValue placeholder="Select report header organization" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_ORGANIZATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">
              Location
            </Label>
            <Input
              value={userForm.location}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, location: event.target.value }))
              }
              placeholder="Quezon City"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => void handleSubmitUserForm()}
              className="h-10 rounded-xl gap-1"
              disabled={isSavingUser}
            >
              {isSavingUser ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingUserId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingUserId ? "Save Changes" : "Create User"}
            </Button>
            {editingUserId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={resetUserForm}
                className="h-10 rounded-xl"
                disabled={isSavingUser}
              >
                Cancel Edit
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
            <Users className="h-4 w-4" />
            Registered Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No users found
            </p>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-2xl border border-border/70 bg-background/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold">
                        {profile.full_name || "Unnamed"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {profile.email || "No email"}
                      </p>
                    </div>
                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {profile.id === user?.id ? "You" : "User"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <p>Joined: {format(new Date(profile.created_at), "MMM d, yyyy")}</p>
                    <p>Location: {profile.location || "No location"}</p>
                    <p className="break-all">
                      Inspector Code: {profile.inspector_code || "N/A"}
                    </p>
                    <p>
                      Report Header:{" "}
                      {profile.report_organization
                        ? getReportOrganizationLabel(profile.report_organization)
                        : "Gordon College CCS (fallback)"}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg gap-1"
                      onClick={() => handleStartEditUser(profile)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg gap-1 text-destructive hover:text-destructive"
                      onClick={() => void handleDeleteUser(profile.id)}
                      disabled={profile.id === user?.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersTabContent;
