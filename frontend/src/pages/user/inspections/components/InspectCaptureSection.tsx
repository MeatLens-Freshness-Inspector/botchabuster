import { CameraCapture, type CapturedImagePayload } from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ScanLine, TestTube2 } from "lucide-react";

type InspectCaptureSectionProps = {
  selectedLocation: string;
  marketLocations: string[];
  isLocationSelectionDisabled: boolean;
  isCaptureDisabled: boolean;
  showAnalyzeAction: boolean;
  isAnalyzeDisabled: boolean;
  isAnalyzeBlockedByModel: boolean;
  isAnalyzing: boolean;
  isDebugFileUploadEnabled: boolean;
  isInAppCameraEnabled: boolean;
  showModelInputPreview: boolean;
  onSelectedLocationChange: (value: string) => void;
  onCapture: (capture: CapturedImagePayload) => void;
  onAnalyze: () => void;
};

export function InspectCaptureSection({
  selectedLocation,
  marketLocations,
  isLocationSelectionDisabled,
  isCaptureDisabled,
  showAnalyzeAction,
  isAnalyzeDisabled,
  isAnalyzeBlockedByModel,
  isAnalyzing,
  isDebugFileUploadEnabled,
  isInAppCameraEnabled,
  showModelInputPreview,
  onSelectedLocationChange,
  onCapture,
  onAnalyze,
}: InspectCaptureSectionProps) {
  return (
    <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-display uppercase tracking-wider text-muted-foreground">
        <TestTube2 className="h-4 w-4" />
        Capture Station
      </div>

      <div className="mb-4 space-y-1">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
          Location Selection
        </Label>
        <Select
          value={selectedLocation}
          onValueChange={onSelectedLocationChange}
          disabled={isLocationSelectionDisabled}
        >
          <SelectTrigger className="h-10 rounded-xl bg-background/60">
            <SelectValue placeholder="Select market location" />
          </SelectTrigger>
          <SelectContent>
            {marketLocations.map((locationName) => (
              <SelectItem key={locationName} value={locationName}>
                {locationName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CameraCapture
        onCapture={onCapture}
        disabled={isCaptureDisabled}
        allowFileUpload={isDebugFileUploadEnabled}
        allowInAppCamera={isInAppCameraEnabled}
        showModelInputPreview={showModelInputPreview}
      />

      {showAnalyzeAction && (
        <div className="mt-4">
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzeDisabled}
            size="lg"
            className="w-full gap-2 rounded-xl font-display uppercase tracking-wider"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing sample...
              </>
            ) : isAnalyzeBlockedByModel ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Preparing MobileNetV3...
              </>
            ) : (
              <>
                <ScanLine className="h-5 w-5" />
                Analyze Sample
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
