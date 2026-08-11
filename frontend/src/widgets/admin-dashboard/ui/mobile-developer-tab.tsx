import DeveloperTabContent from "./developer-tab-content";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";

type DeveloperTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const DeveloperTab = (_props: DeveloperTabProps) => {
  return <DeveloperTabContent />;
};

export default DeveloperTab;
