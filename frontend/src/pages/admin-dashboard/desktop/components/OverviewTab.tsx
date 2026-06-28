import OverviewTabContent from "../../components/tab-content/OverviewTabContent";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type OverviewTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const OverviewTab = ({ dashboard }: OverviewTabProps) => {
  return <OverviewTabContent dashboard={dashboard} />;
};

export default OverviewTab;
