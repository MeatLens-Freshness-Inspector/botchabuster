import ReportsWidget from "./mobile-reports-tab";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";

type ReportsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const ReportsTab = ({ dashboard }: ReportsTabProps) => {
  return <ReportsWidget dashboard={dashboard} />;
};

export default ReportsTab;
