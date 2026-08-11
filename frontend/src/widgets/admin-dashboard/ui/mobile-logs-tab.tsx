import LogsWidget from "./logs-tab";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";

type LogsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const LogsTab = ({ dashboard }: LogsTabProps) => {
  return <LogsWidget dashboard={dashboard} />;
};

export default LogsTab;
