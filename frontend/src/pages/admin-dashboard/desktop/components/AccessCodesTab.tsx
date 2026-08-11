import { AccessCodesTab as AccessCodesWidget } from "@/widgets/admin-dashboard";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type AccessCodesTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const AccessCodesTab = ({ dashboard }: AccessCodesTabProps) => {
  return <AccessCodesWidget dashboard={dashboard} />;
};

export default AccessCodesTab;
