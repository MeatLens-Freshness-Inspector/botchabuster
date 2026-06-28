import UsersTabContent from "../../components/tab-content/UsersTabContent";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type UsersTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const UsersTab = ({ dashboard }: UsersTabProps) => {
  return <UsersTabContent dashboard={dashboard} />;
};

export default UsersTab;
