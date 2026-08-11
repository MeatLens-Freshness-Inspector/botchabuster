import { useIsDesktop } from "@/shared/hooks/use-desktop";
import AdminDashboard from "./AdminDashboard";
import DesktopAdminDashboard from "./DesktopAdminDashboard";
import { BottomNav } from "@/widgets/navigation";
import { useAuth } from "@/contexts/AuthContext";

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
