import { UsersTab as UsersWidget } from "./users/users-tab";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";

type UsersTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const UsersTab = ({ dashboard }: UsersTabProps) => {
  return <UsersWidget dashboard={dashboard} />;
};

export default UsersTab;
