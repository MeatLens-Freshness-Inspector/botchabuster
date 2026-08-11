import InspectionsWidget from "./inspections-tab";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";

type InspectionsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const InspectionsTab = ({ dashboard }: InspectionsTabProps) => {
  return <InspectionsWidget dashboard={dashboard} />;
};

export default InspectionsTab;
