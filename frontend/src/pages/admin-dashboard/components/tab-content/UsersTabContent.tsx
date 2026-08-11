import { format } from "date-fns";
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  REPORT_ORGANIZATION_OPTIONS,
  getReportOrganizationLabel,
  type ReportOrganization,
} from "@/features/reports";
import { Button } from "@/shared/ui";
import { SmartPagination } from "@/shared/ui/SmartPagination";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui";
import { Label } from "@/shared/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type UsersTabContentProps = {
  dashboard: AdminDashboardPageViewModel;
};

const UsersTabContent = ({ dashboard }: UsersTabContentProps) => {
  const {
    user,
    userForm,
    editingUserId,
    editingUser,
    editUserForm,
    isSavingUser,
    profiles,
    userSearchQuery,
    userPage,
    userPageSize,
    filteredProfiles,
    paginatedProfiles,
    totalUserPages,
    setUserSearchQuery,
    setUserPage,
    setUserPageSize,
    setUserForm,
    setEditUserForm,
    handleStartEditUser,
    closeEditUserModal,
    handleSaveEditUser,
    handleSubmitUserForm,
    handleDeleteUser,
  } = dashboard;

  const startRange =
    filteredProfiles.length === 0 ? 0 : (userPage - 1) * userPageSize + 1;
  const endRange = Math.min(userPage * userPageSize, filteredProfiles.length);

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      {/* Left Card: Add User */}
      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
            <UserPlus className="h-4 w-4" />
            Add User
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
              Password
            </Label>
            <Input
              type="password"
              value={userForm.password}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, password: event.target.value }))
              }
              placeholder="At least 6 characters"
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
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right Card: Registered Users */}
      <Card className="min-w-0 rounded-3xl border-border/70 bg-card/95">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm font-display uppercase tracking-wider">
              <Users className="h-4 w-4 text-primary" />
              Registered Users
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-sans text-xs font-semibold text-primary">
                {profiles.length}
              </span>
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Search Bar & Page Size Selector */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, code, location..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="h-9 rounded-xl pl-8 pr-8 text-xs"
              />
              {userSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <Select
              value={String(userPageSize)}
              onValueChange={(val) => {
                setUserPageSize(Number(val));
                setUserPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Users per page"
                className="h-9 w-[110px] rounded-xl text-xs bg-background/80"
              >
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 / page</SelectItem>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="15">15 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Status Summary */}
          {userSearchQuery.trim() ? (
            <p className="text-xs text-muted-foreground">
              Showing {startRange}–{endRange} of {filteredProfiles.length} matching user
              {filteredProfiles.length !== 1 ? "s" : ""}
            </p>
          ) : null}

          {/* User List */}
          {filteredProfiles.length === 0 ? (
            <div className="py-10 text-center">
              <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {userSearchQuery.trim()
                  ? `No users matching "${userSearchQuery.trim()}"`
                  : "No users found"}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginatedProfiles.map((profile) => {
                const isSelf = profile.id === user?.id;
                const initial = profile.full_name
                  ? profile.full_name.trim()[0].toUpperCase()
                  : (profile.email || "U")[0].toUpperCase();

                return (
                  <div
                    key={profile.id}
                    className="group min-w-0 rounded-2xl border border-border/70 bg-background/60 p-2.5 transition-all hover:border-primary/40 hover:bg-background/80"
                  >
                    {/* Header Row: Avatar, Name, Email, Role Pill & Top-Right Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-xs font-bold text-primary">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-display text-sm font-semibold text-foreground">
                              {profile.full_name || "Unnamed"}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider ${
                                isSelf
                                  ? "border border-primary/40 bg-primary/10 text-primary"
                                  : "border border-border/60 bg-muted/60 text-muted-foreground"
                              }`}
                            >
                              {isSelf ? "You" : "User"}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {profile.email || "No email"}
                          </p>
                        </div>
                      </div>

                      {/* Top Right Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleStartEditUser(profile)}
                          title="Edit user details"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="ml-1 hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void handleDeleteUser(profile.id)}
                          disabled={isSelf}
                          title={
                            isSelf
                              ? "You cannot delete your own account"
                              : "Delete user"
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="ml-1 hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    </div>

                    {/* Compressed 2-Column Details Ribbon */}
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 rounded-xl border border-border/40 bg-card/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1 truncate">
                        <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">
                          Joined:{" "}
                          <span className="font-medium text-foreground">
                            {format(new Date(profile.created_at), "MMM d, yyyy")}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1 truncate">
                        <span className="font-mono text-[10px] text-muted-foreground/70">#</span>
                        <span className="truncate">
                          Code:{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                            {profile.inspector_code || "N/A"}
                          </code>
                        </span>
                      </div>

                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">
                          Location:{" "}
                          <span className="font-medium text-foreground">
                            {profile.location || "No location"}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span
                          className="truncate"
                          title={
                            profile.report_organization
                              ? getReportOrganizationLabel(profile.report_organization)
                              : "Gordon College CCS (fallback)"
                          }
                        >
                          Report Header:{" "}
                          <span className="font-medium text-foreground">
                            {profile.report_organization
                              ? getReportOrganizationLabel(profile.report_organization)
                              : "Gordon College CCS"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalUserPages > 1 && (
            <div className="border-t border-border/70 pt-3">
              <SmartPagination
                currentPage={userPage}
                totalPages={totalUserPages}
                onPageChange={setUserPage}
                totalItems={filteredProfiles.length}
                pageSize={userPageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal Dialog */}
      <Dialog
        open={Boolean(editingUserId)}
        onOpenChange={(open) => {
          if (!open) closeEditUserModal();
        }}
      >
        <DialogContent className="max-w-lg rounded-3xl border-border/70 bg-card/95 p-6 shadow-xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-base uppercase tracking-wider text-foreground">
              <Pencil className="h-4 w-4 text-primary" />
              Edit User Credentials
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update details or assign a new password for{" "}
              <span className="font-semibold text-foreground">
                {editingUser?.full_name || editingUser?.email || "selected user"}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Full Name
              </Label>
              <Input
                value={editUserForm.full_name}
                onChange={(event) =>
                  setEditUserForm((prev) => ({
                    ...prev,
                    full_name: event.target.value,
                  }))
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
                value={editUserForm.email}
                onChange={(event) =>
                  setEditUserForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                placeholder="inspector@example.com"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                New Password (Optional)
              </Label>
              <Input
                type="password"
                value={editUserForm.password}
                onChange={(event) =>
                  setEditUserForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                placeholder="Leave blank to keep current password"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                Inspector Code
              </Label>
              <Input
                value={editUserForm.inspector_code}
                onChange={(event) =>
                  setEditUserForm((prev) => ({
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
                value={editUserForm.report_organization || undefined}
                onValueChange={(value) =>
                  setEditUserForm((prev) => ({
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
                value={editUserForm.location}
                onChange={(event) =>
                  setEditUserForm((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
                placeholder="Quezon City"
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={closeEditUserModal}
              className="h-9 rounded-xl text-xs"
              disabled={isSavingUser}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSaveEditUser()}
              className="h-9 rounded-xl text-xs gap-1.5"
              disabled={isSavingUser}
            >
              {isSavingUser ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersTabContent;
