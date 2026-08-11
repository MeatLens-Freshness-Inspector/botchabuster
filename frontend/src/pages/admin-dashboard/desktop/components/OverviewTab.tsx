import { InspectionChart } from "@/widgets/admin-dashboard";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type OverviewTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const OverviewTab = ({ dashboard }: OverviewTabProps) => {
  return <InspectionChart dashboard={dashboard} />;
};

export default OverviewTab;
