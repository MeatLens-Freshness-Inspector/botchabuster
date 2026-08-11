import OverviewTabContent from "../../components/tab-content/OverviewTabContent";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type OverviewTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const OverviewTab = ({ dashboard }: OverviewTabProps) => {
  return <OverviewTabContent dashboard={dashboard} />;
};

export default OverviewTab;
