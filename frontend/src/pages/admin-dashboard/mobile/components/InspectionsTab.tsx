import { InspectionsTab as InspectionsWidget } from "@/widgets/admin-dashboard";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type InspectionsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const InspectionsTab = ({ dashboard }: InspectionsTabProps) => {
  return <InspectionsWidget dashboard={dashboard} />;
};

export default InspectionsTab;
