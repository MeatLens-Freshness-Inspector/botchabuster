import LogsTabContent from "../../components/tab-content/LogsTabContent";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type LogsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const LogsTab = ({ dashboard }: LogsTabProps) => {
  return <LogsTabContent dashboard={dashboard} />;
};

export default LogsTab;
