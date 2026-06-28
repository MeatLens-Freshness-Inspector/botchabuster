import LogsTabContent from "../../components/tab-content/LogsTabContent";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type LogsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const LogsTab = ({ dashboard }: LogsTabProps) => {
  return <LogsTabContent dashboard={dashboard} />;
};

export default LogsTab;
