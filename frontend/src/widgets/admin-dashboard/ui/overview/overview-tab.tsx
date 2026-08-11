import type { AdminDashboardPageViewModel } from "../../model/use-admin-dashboard";
import InspectionChart from "./inspection-chart";

export function OverviewTab({ dashboard }: { dashboard: AdminDashboardPageViewModel }) {
  return <InspectionChart dashboard={dashboard} />;
}
