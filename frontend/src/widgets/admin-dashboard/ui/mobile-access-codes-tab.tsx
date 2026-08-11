import AccessCodesTab from "./access-codes-tab";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type AccessCodesTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const MobileAccessCodesTab = ({ dashboard }: AccessCodesTabProps) => {
  return <AccessCodesTab dashboard={dashboard} />;
};

export default MobileAccessCodesTab;
