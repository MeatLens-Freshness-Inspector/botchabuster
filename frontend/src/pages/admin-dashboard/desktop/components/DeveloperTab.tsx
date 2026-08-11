import DeveloperTabContent from "../../components/tab-content/DeveloperTabContent";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type DeveloperTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const DeveloperTab = (_props: DeveloperTabProps) => {
  return <DeveloperTabContent />;
};

export default DeveloperTab;
