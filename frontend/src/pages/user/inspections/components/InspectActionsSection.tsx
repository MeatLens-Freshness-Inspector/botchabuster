import { Button } from "@/components/ui/button";
import { Clock, Loader2, RotateCcw, Save } from "lucide-react";
import type { InspectionSaveStatus } from "../types";

type InspectActionsSectionProps = {
  saveStatus: InspectionSaveStatus;
  isCreateInspectionPending: boolean;
  saveButtonLabel: string;
  onReset: () => void;
  onSave: () => void;
};

export function InspectActionsSection({
  saveStatus,
  isCreateInspectionPending,
  saveButtonLabel,
  onReset,
  onSave,
}: InspectActionsSectionProps) {
  return (
    <section className="mt-4 rounded-3xl border border-border/70 bg-card/92 p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={onReset}
          disabled={saveStatus === "saving" || isCreateInspectionPending}
          className="flex-1 gap-2 rounded-xl"
        >
          <RotateCcw className="h-4 w-4" />
          New Scan
        </Button>
        <Button
          onClick={onSave}
          disabled={saveStatus !== "idle" || isCreateInspectionPending}
          className="flex-1 gap-2 rounded-xl"
        >
          {saveStatus === "saving" || isCreateInspectionPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saveStatus === "queued" ? (
            <Clock className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saveButtonLabel}
        </Button>
      </div>
    </section>
  );
}
