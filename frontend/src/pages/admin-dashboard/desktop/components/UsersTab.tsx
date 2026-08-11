import { UserTable } from "@/widgets/admin-dashboard";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type UsersTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const UsersTab = ({ dashboard }: UsersTabProps) => {
  return <UserTable dashboard={dashboard} />;
};

export default UsersTab;
