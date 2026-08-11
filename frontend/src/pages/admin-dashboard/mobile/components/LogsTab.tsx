import { LogsTab as LogsWidget } from "@/widgets/admin-dashboard";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type LogsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const LogsTab = ({ dashboard }: LogsTabProps) => {
  return <LogsWidget dashboard={dashboard} />;
};

export default LogsTab;
