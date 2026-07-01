import { useInspectPage } from "../hooks/useInspectPage";
import { InspectActionsSection } from "./InspectActionsSection";
import { InspectAnalysisSection } from "./InspectAnalysisSection";
import { InspectCaptureSection } from "./InspectCaptureSection";
import { InspectHeroSection } from "./InspectHeroSection";
import { InspectPreScanSection } from "./InspectPreScanSection";

const InspectPageView = () => {
  const inspectPage = useInspectPage();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-4">
        <InspectHeroSection
          locationDisplayLabel={inspectPage.locationDisplayLabel}
          coordinateStatusText={inspectPage.coordinateStatusText}
          captureStatusText={inspectPage.captureStatusText}
          analysisStatusText={inspectPage.analysisStatusText}
          confidenceText={inspectPage.confidenceText}
          confidenceSummaryClass={inspectPage.confidenceSummaryClass}
        />

        <InspectPreScanSection
          form={inspectPage.preScanForm}
          isBypassed={inspectPage.isPreScanBypassed}
          isChecklistComplete={inspectPage.isPreScanChecklistComplete}
          isLocked={Boolean(inspectPage.capturedInput) || inspectPage.saveStatus === "saving"}
          onFieldChange={inspectPage.onPreScanFieldChange}
        />

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <InspectCaptureSection
            selectedLocation={inspectPage.selectedLocation}
            locationDisplayLabel={inspectPage.locationDisplayLabel}
            coordinateStatusText={inspectPage.coordinateStatusText}
            marketLocations={inspectPage.marketLocations}
            isPreScanChecklistComplete={inspectPage.isPreScanChecklistComplete}
            isLocationSelectionDisabled={inspectPage.isLocationSelectionDisabled}
            isCaptureDisabled={inspectPage.isCaptureDisabled}
            showAnalyzeAction={inspectPage.showAnalyzeAction}
            isAnalyzeDisabled={inspectPage.isAnalyzeDisabled}
            isAnalyzeBlockedByModel={inspectPage.isAnalyzeBlockedByModel}
            isAnalyzing={inspectPage.isAnalyzing}
            isDebugFileUploadEnabled={inspectPage.isDebugFileUploadEnabled}
            isInAppCameraEnabled={inspectPage.isInAppCameraEnabled}
            showModelInputPreview={inspectPage.showModelInputPreview}
            onSelectedLocationChange={inspectPage.onSelectedLocationChange}
            onCapture={inspectPage.onCapture}
            onAnalyze={inspectPage.onAnalyze}
          />

          <InspectAnalysisSection
            result={inspectPage.result}
            inspectionDecisionSource={inspectPage.inspectionDecisionSource}
            showDetailedResults={inspectPage.showDetailedResults}
          />
        </div>

        {inspectPage.showSaveActions && (
          <InspectActionsSection
            saveStatus={inspectPage.saveStatus}
            isCreateInspectionPending={inspectPage.isCreateInspectionPending}
            saveButtonLabel={inspectPage.saveButtonLabel}
            onReset={inspectPage.onReset}
            onSave={inspectPage.onSave}
          />
        )}
      </div>
    </div>
  );
};

export default InspectPageView;
