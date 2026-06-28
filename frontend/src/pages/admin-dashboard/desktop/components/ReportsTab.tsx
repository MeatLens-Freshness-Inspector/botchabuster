import DesktopReportsTabContent from "../../components/tab-content/DesktopReportsTabContent";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type ReportsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const ReportsTab = ({ dashboard }: ReportsTabProps) => {
  return <DesktopReportsTabContent dashboard={dashboard} />;
};

export default ReportsTab;
