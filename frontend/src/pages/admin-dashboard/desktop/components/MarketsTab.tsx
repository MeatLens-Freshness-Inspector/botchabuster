import { MarketsTab as MarketsWidget } from "@/widgets/admin-dashboard";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type MarketsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const MarketsTab = ({ dashboard }: MarketsTabProps) => {
  return <MarketsWidget dashboard={dashboard} />;
};

export default MarketsTab;
