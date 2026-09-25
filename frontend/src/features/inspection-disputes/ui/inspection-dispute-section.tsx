import { useState } from "react";
import type { FreshnessClassification } from "@/entities/inspection";
import { FRESHNESS_CLASSIFICATIONS } from "@/entities/inspection";
import { Button, Label } from "@/shared/ui";
import { Scale } from "lucide-react";

type InspectionDisputeSectionProps = {
  inspectionId: string | null;
  classification: FreshnessClassification;
  isSubmitting: boolean;
  isSubmitted: boolean;
  onSubmit: (input: {
    expectedClassification: FreshnessClassification;
    reason: string;
  }) => void | Promise<void>;
};

export function InspectionDisputeSection({
  inspectionId,
  classification,
  isSubmitting,
  isSubmitted,
  onSubmit,
}: InspectionDisputeSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expectedClassification, setExpectedClassification] =
    useState<FreshnessClassification>(classification);
  const [reason, setReason] = useState("");

  if (!inspectionId) return null;

  if (isSubmitted) {
    return (
      <section className="mt-4 rounded-3xl border border-primary/25 bg-primary/5 p-4">
        <p className="flex items-center gap-1.5 text-xs font-display uppercase tracking-widest text-primary">
          <Scale className="h-3.5 w-3.5" /> Dispute result
        </p>
        <p className="mt-2 text-sm font-semibold">Pending review</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Your dispute was submitted. An administrator or developer will review the expected result.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-3xl border border-primary/25 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-display uppercase tracking-widest text-primary">
            <Scale className="h-3.5 w-3.5" /> Dispute result
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Think this result is wrong? Submit the result you expect and explain the inspection evidence.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setExpectedClassification(classification);
            setReason("");
            setIsFormOpen((open) => !open);
          }}
        >
          {isFormOpen ? "Cancel" : "Dispute result"}
        </Button>
      </div>

      {isFormOpen && (
        <form
          className="mt-3 space-y-3 border-t border-primary/15 pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            const FormDataConstructor = event.currentTarget.ownerDocument.defaultView?.FormData;
            if (!FormDataConstructor) return;
            const formData = new FormDataConstructor(event.currentTarget);
            const submittedClassification = formData.get("expectedClassification");
            const submittedReason = formData.get("reason");
            if (typeof submittedClassification !== "string" || typeof submittedReason !== "string") {
              return;
            }
            void onSubmit({
              expectedClassification: submittedClassification as FreshnessClassification,
              reason: submittedReason.trim(),
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`inspect-dispute-result-${inspectionId}`}>Expected result</Label>
            <select
              id={`inspect-dispute-result-${inspectionId}`}
              name="expectedClassification"
              value={expectedClassification}
              onChange={(event) => setExpectedClassification(event.target.value as FreshnessClassification)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize"
            >
              {FRESHNESS_CLASSIFICATIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`inspect-dispute-reason-${inspectionId}`}>Why is the result incorrect?</Label>
            <textarea
              id={`inspect-dispute-reason-${inspectionId}`}
              name="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              maxLength={2000}
              rows={4}
              placeholder="Describe the visible evidence or inspection finding."
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              {reason.trim().length}/2000 characters; minimum 10.
            </p>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || reason.trim().length < 10}
          >
            {isSubmitting ? "Submitting..." : "Submit dispute"}
          </Button>
        </form>
      )}
    </section>
  );
}
