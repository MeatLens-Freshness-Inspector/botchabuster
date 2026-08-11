import AccessCodesTabContent from "../../components/tab-content/AccessCodesTabContent";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type AccessCodesTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const AccessCodesTab = ({ dashboard }: AccessCodesTabProps) => {
  return <AccessCodesTabContent dashboard={dashboard} />;
};

export default AccessCodesTab;
