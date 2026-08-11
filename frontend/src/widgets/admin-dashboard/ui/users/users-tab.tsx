import type { AdminDashboardPageViewModel } from "../../model/use-admin-dashboard";
import UserTable from "./user-table";

export function UsersTab({ dashboard }: { dashboard: AdminDashboardPageViewModel }) {
  return <UserTable dashboard={dashboard} />;
}
