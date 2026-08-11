import { OverviewTab as OverviewWidget } from "./overview/overview-tab";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";

type OverviewTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const OverviewTab = ({ dashboard }: OverviewTabProps) => {
  return <OverviewWidget dashboard={dashboard} />;
};

export default OverviewTab;
