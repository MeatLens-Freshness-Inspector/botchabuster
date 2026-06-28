import DeveloperTabContent from "../../components/tab-content/DeveloperTabContent";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type DeveloperTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const DeveloperTab = (_props: DeveloperTabProps) => {
  return <DeveloperTabContent />;
};

export default DeveloperTab;
