import { OverviewTab as OverviewWidget } from "@/widgets/admin-dashboard";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type OverviewTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const OverviewTab = ({ dashboard }: OverviewTabProps) => {
  return <OverviewWidget dashboard={dashboard} />;
};

export default OverviewTab;
