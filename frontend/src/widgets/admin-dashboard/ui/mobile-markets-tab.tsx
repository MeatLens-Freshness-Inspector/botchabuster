import MarketsTab from "./markets-tab";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type MarketsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const MobileMarketsTab = ({ dashboard }: MarketsTabProps) => {
  return <MarketsTab dashboard={dashboard} />;
};

export default MobileMarketsTab;
