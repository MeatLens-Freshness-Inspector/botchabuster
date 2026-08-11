import AccessCodesWidget from "./access-codes-tab";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";

type AccessCodesTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const AccessCodesTab = ({ dashboard }: AccessCodesTabProps) => {
  return <AccessCodesWidget dashboard={dashboard} />;
};

export default AccessCodesTab;
