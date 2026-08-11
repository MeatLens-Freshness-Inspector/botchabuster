import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { TermsAndConditionsContent } from "@/components/TermsAndConditionsContent";

interface TermsAndConditionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsAndConditionsDialog({ open, onOpenChange }: TermsAndConditionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-4">
          <DialogTitle className="font-display text-lg uppercase tracking-wider">MeatLens Terms and Conditions</DialogTitle>
          <DialogDescription>Field-use policy and responsibilities for inspectors and market users.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <TermsAndConditionsContent />
        </div>
      </DialogContent>
    </Dialog>
  );
}
