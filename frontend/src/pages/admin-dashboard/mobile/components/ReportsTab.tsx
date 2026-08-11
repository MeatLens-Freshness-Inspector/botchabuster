import MobileReportsTabContent from "../../components/tab-content/MobileReportsTabContent";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type ReportsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const ReportsTab = ({ dashboard }: ReportsTabProps) => {
  return <MobileReportsTabContent dashboard={dashboard} />;
};

export default ReportsTab;
