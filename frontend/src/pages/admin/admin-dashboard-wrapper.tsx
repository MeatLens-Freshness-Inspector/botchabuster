import { useIsDesktop } from "@/shared/hooks/use-desktop";
import AdminDashboard from "./admin-dashboard-page";
import DesktopAdminDashboard from "./desktop-admin-dashboard-page";
import { BottomNav } from "@/widgets/navigation";
import { useAuth } from "@/entities/user";

export default function AdminDashboardWrapper() {
  const isDesktop = useIsDesktop();
  const { isAdmin } = useAuth();

  if (isDesktop === undefined) {
    return null;
  }

  return (
    <>
      {isDesktop ? <DesktopAdminDashboard /> : <AdminDashboard />}
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
