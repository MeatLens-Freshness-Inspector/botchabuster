import MarketsTabContent from "../../components/tab-content/MarketsTabContent";
import type { AdminDashboardPageViewModel } from "@/widgets/admin-dashboard";

type MarketsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const MarketsTab = ({ dashboard }: MarketsTabProps) => {
  return <MarketsTabContent dashboard={dashboard} />;
};

export default MarketsTab;
