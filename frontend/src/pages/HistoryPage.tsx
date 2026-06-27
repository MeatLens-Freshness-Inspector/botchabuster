import { HistoryHeader } from "./user/history/components/HistoryHeader";
import { InspectionTimelineSection } from "./user/history/components/InspectionTimelineSection";
import { HistorySidebar } from "./user/history/components/HistorySidebar";
import { InspectionDetailSheet } from "@/components/InspectionDetailSheet";
import { useHistoryPage } from "./user/history/hooks/useHistoryPage";

const HistoryPage = () => {
  const {
    isLoading,
    activeFilter,
    searchText,
    selectedReportDay,
    selectedInspection,
    totalInspections,
    avgConfidence,
    freshRate,
    spoiledRate,
    filteredInspections,
    hasValidReportDay,
    formattedReportDayLabel,
    selectedDayInspections,
    selectedDayAverageConfidence,
    pagedInspections,
    totalPages,
    safePage,
    classificationCounts,
    monthlyCounts,
    setCurrentPage,
    updateSearchText,
    updateReportDay,
    updateActiveFilter,
    selectInspection,
    setSelectedInspection,
    handleExportDetailedPdf,
  } = useHistoryPage();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-4">
        <HistoryHeader
          totalInspections={totalInspections}
          avgConfidence={avgConfidence}
          freshRate={freshRate}
          spoiledRate={spoiledRate}
        />

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <InspectionTimelineSection
            activeFilter={activeFilter}
            filteredCount={filteredInspections.length}
            formattedReportDayLabel={formattedReportDayLabel}
            hasValidReportDay={hasValidReportDay}
            isLoading={isLoading}
            pagedInspections={pagedInspections}
            safePage={safePage}
            searchText={searchText}
            selectedDayCount={selectedDayInspections.length}
            selectedReportDay={selectedReportDay}
            totalPages={totalPages}
            onActiveFilterChange={updateActiveFilter}
            onExportDetailedPdf={handleExportDetailedPdf}
            onInspectionSelect={selectInspection}
            onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onReportDayChange={updateReportDay}
            onSearchTextChange={updateSearchText}
          />

          <HistorySidebar
            classificationCounts={classificationCounts}
            monthlyCounts={monthlyCounts}
            selectedDayAverageConfidence={selectedDayAverageConfidence}
            selectedDayCount={selectedDayInspections.length}
            totalInspections={totalInspections}
          />
        </div>
      </div>

      <InspectionDetailSheet
        inspection={selectedInspection}
        open={selectedInspection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInspection(null);
          }
        }}
      />
    </div>
  );
};

export default HistoryPage;
