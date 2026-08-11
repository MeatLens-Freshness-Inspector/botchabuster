import MarketsWidget from "./markets-tab";
import type { AdminDashboardPageViewModel } from "../model/use-admin-dashboard";

type MarketsTabProps = {
  dashboard: AdminDashboardPageViewModel;
};

const MarketsTab = ({ dashboard }: MarketsTabProps) => {
  return <MarketsWidget dashboard={dashboard} />;
};

export default MarketsTab;
