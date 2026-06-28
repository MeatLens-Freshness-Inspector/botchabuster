import InspectionsTabContent from "../../components/tab-content/InspectionsTabContent";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type InspectionsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const InspectionsTab = ({ dashboard }: InspectionsTabProps) => {
  return <InspectionsTabContent dashboard={dashboard} />;
};

export default InspectionsTab;
