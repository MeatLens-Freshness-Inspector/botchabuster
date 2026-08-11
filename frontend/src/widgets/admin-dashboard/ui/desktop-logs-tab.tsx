import LogsTab from "./logs-tab";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type LogsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const DesktopLogsTab = ({ dashboard }: LogsTabProps) => {
  return <LogsTab dashboard={dashboard} />;
};

export default DesktopLogsTab;
