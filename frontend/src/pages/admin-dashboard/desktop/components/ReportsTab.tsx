import DesktopReportsTabContent from "../../components/tab-content/DesktopReportsTabContent";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type ReportsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const ReportsTab = ({ dashboard }: ReportsTabProps) => {
  return <DesktopReportsTabContent dashboard={dashboard} />;
};

export default ReportsTab;
