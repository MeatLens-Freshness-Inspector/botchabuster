import { useMemo, useState } from "react";
import type { Profile } from "@/entities/user/api";
import { getReportOrganizationLabel } from "@/features/reports";

export function useUsersTab(profiles: Profile[]) {
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(5);

  const filteredProfiles = useMemo(() => {
    const query = userSearchQuery.trim().toLowerCase();
    if (!query) return profiles;

    return profiles.filter((profile) => {
      const fullName = (profile.full_name || "").toLowerCase();
      const email = (profile.email || "").toLowerCase();
      const code = (profile.inspector_code || "").toLowerCase();
      const location = (profile.location || "").toLowerCase();
      const organization = profile.report_organization
        ? getReportOrganizationLabel(profile.report_organization).toLowerCase()
        : "";

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        code.includes(query) ||
        location.includes(query) ||
        organization.includes(query)
      );
    });
  }, [profiles, userSearchQuery]);

  const totalUserPages = Math.max(1, Math.ceil(filteredProfiles.length / userPageSize));
  const paginatedProfiles = useMemo(() => {
    const safePage = Math.min(Math.max(1, userPage), totalUserPages);
    const start = (safePage - 1) * userPageSize;
    return filteredProfiles.slice(start, start + userPageSize);
  }, [filteredProfiles, totalUserPages, userPage, userPageSize]);

  return {
    filteredProfiles,
    paginatedProfiles,
    totalUserPages,
    userPage,
    userPageSize,
    userSearchQuery,
    setUserPage,
    setUserPageSize,
    setUserSearchQuery,
  };
}
