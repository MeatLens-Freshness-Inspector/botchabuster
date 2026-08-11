import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { profileClient, type Profile } from "@/entities/user/api";
import { isReportOrganization } from "@/features/reports";
import type { AdminDashboardStats } from "./use-overview-tab";
import type { ManagedUserForm } from "./types";

const EMPTY_USER_FORM: ManagedUserForm = {
  full_name: "",
  email: "",
  password: "",
  inspector_code: "",
  report_organization: "",
  location: "",
};

interface UseUserActionsOptions {
  currentUserId?: string;
  profiles: Profile[];
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
  setStats: Dispatch<SetStateAction<AdminDashboardStats | null>>;
  setUserPage: Dispatch<SetStateAction<number>>;
}

export function useUserActions({
  currentUserId,
  profiles: _profiles,
  setProfiles,
  setStats,
  setUserPage,
}: UseUserActionsOptions) {
  const [userForm, setUserForm] = useState<ManagedUserForm>({ ...EMPTY_USER_FORM });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editUserForm, setEditUserForm] = useState<ManagedUserForm>({ ...EMPTY_USER_FORM });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);

  const resetUserForm = () => setUserForm({ ...EMPTY_USER_FORM });

  const handleStartEditUser = (profile: Profile) => {
    setEditingUserId(profile.id);
    setEditingUser(profile);
    setEditUserForm({
      full_name: profile.full_name || "",
      email: profile.email || "",
      password: "",
      inspector_code: profile.inspector_code || "",
      report_organization: profile.report_organization || "",
      location: profile.location || "",
    });
  };

  const closeEditUserModal = () => {
    setEditingUserId(null);
    setEditingUser(null);
    setEditUserForm({ ...EMPTY_USER_FORM });
  };

  const handleSubmitUserForm = async () => {
    const email = userForm.email.trim();
    const password = userForm.password.trim();
    const reportOrganization = isReportOrganization(userForm.report_organization)
      ? userForm.report_organization
      : null;

    if (!email) {
      toast.error("Email is required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSavingUser(true);
    try {
      const created = await profileClient.createUserByAdmin({
        email,
        password,
        full_name: userForm.full_name.trim() || null,
        inspector_code: userForm.inspector_code.trim() || null,
        report_organization: reportOrganization,
        location: userForm.location.trim() || null,
      });

      setProfiles((previous) => [created, ...previous]);
      setStats((previous) => (previous ? { ...previous, total_users: previous.total_users + 1 } : previous));
      setUserPage(1);
      toast.success("User created");
      resetUserForm();
    } catch (error) {
      console.error("Failed to create user:", error);
      const message = error instanceof Error && error.message ? error.message : "Failed to create user";
      toast.error(message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSaveEditUser = async () => {
    if (!editingUserId) return;
    const email = editUserForm.email.trim();
    const password = editUserForm.password.trim();
    const reportOrganization = isReportOrganization(editUserForm.report_organization)
      ? editUserForm.report_organization
      : null;

    if (!email) {
      toast.error("Email is required");
      return;
    }

    if (password.length > 0 && password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setIsSavingUser(true);
    try {
      const updated = await profileClient.updateUserByAdmin(editingUserId, {
        email,
        full_name: editUserForm.full_name.trim() || null,
        inspector_code: editUserForm.inspector_code.trim() || null,
        report_organization: reportOrganization,
        location: editUserForm.location.trim() || null,
        ...(password ? { password } : {}),
      });

      setProfiles((previous) => previous.map((profile) => (profile.id === editingUserId ? updated : profile)));
      toast.success("User credentials updated");
      closeEditUserModal();
    } catch (error) {
      console.error("Failed to update user:", error);
      const message = error instanceof Error && error.message ? error.message : "Failed to update user";
      toast.error(message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (profileId: string) => {
    if (profileId === currentUserId) {
      toast.error("You can't delete your own account");
      return;
    }
    setPendingDeleteUserId(profileId);
  };

  const confirmDeleteUser = async () => {
    const profileId = pendingDeleteUserId;
    if (!profileId) return;
    setPendingDeleteUserId(null);

    try {
      await profileClient.deleteUserByAdmin(profileId);
      setProfiles((previous) => previous.filter((profile) => profile.id !== profileId));
      setStats((previous) => (previous ? { ...previous, total_users: Math.max(0, previous.total_users - 1) } : previous));
      if (editingUserId === profileId) closeEditUserModal();
      toast.success("User deleted");
    } catch {
      console.error("Failed to delete user");
      toast.error("Failed to delete user");
    }
  };

  return {
    closeEditUserModal,
    confirmDeleteUser,
    editUserForm,
    editingUser,
    editingUserId,
    handleDeleteUser,
    handleSaveEditUser,
    handleStartEditUser,
    handleSubmitUserForm,
    isSavingUser,
    pendingDeleteUserId,
    resetUserForm,
    setEditUserForm,
    setPendingDeleteUserId,
    setUserForm,
    userForm,
  };
}
