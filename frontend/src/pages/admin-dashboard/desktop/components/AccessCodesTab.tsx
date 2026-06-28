import AccessCodesTabContent from "../../components/tab-content/AccessCodesTabContent";
import type { AdminDashboardPageViewModel } from "../../hooks/useAdminDashboardPage";

type AccessCodesTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const AccessCodesTab = ({ dashboard }: AccessCodesTabProps) => {
  return <AccessCodesTabContent dashboard={dashboard} />;
};

export default AccessCodesTab;
