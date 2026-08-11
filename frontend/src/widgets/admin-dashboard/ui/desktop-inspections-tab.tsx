import InspectionsTab from "./inspections-tab";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type InspectionsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const DesktopInspectionsTab = ({ dashboard }: InspectionsTabProps) => {
  return <InspectionsTab dashboard={dashboard} />;
};

export default DesktopInspectionsTab;
