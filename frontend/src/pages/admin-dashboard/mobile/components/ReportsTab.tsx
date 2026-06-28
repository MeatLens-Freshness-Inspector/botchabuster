import MobileReportsTabContent from "../../components/tab-content/MobileReportsTabContent";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type ReportsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const ReportsTab = ({ dashboard }: ReportsTabProps) => {
  return <MobileReportsTabContent dashboard={dashboard} />;
};

export default ReportsTab;
