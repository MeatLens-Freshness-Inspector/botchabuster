import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { AdminDashboardPageViewModel } from "../hooks/useAdminDashboardPage";

type AdminDashboardDialogsProps = {
  dashboard: AdminDashboardPageViewModel;
};

const AdminDashboardDialogs = ({ dashboard }: AdminDashboardDialogsProps) => {
  const {
    previewImageUrl,
    pendingDeleteUserId,
    pendingDeleteInspectionId,
    pendingDeleteCodeId,
    pendingDeleteMarketId,
    setPreviewImageUrl,
    setPendingDeleteUserId,
    setPendingDeleteInspectionId,
    setPendingDeleteCodeId,
    setPendingDeleteMarketId,
    confirmDeleteUser,
    confirmDeleteInspection,
    confirmDeleteCode,
    confirmDeleteMarket,
  } = dashboard;

  return (
    <>
      <Dialog
        open={Boolean(previewImageUrl)}
        onOpenChange={(open) => !open && setPreviewImageUrl(null)}
      >
        <DialogContent className="w-[min(96vw,980px)] max-w-5xl border-none bg-transparent p-0 shadow-none">
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt="Inspection full view"
              className="max-h-[85vh] w-full rounded-2xl border border-border/70 bg-black/60 object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDeleteUserId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteUserId(null);
        }}
        title="Delete user?"
        description="This will permanently delete the user and all related records. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteUser}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteInspectionId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteInspectionId(null);
        }}
        title="Delete inspection?"
        description="Are you sure you want to delete this inspection record? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteInspection}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteCodeId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteCodeId(null);
        }}
        title="Delete access code?"
        description="Are you sure you want to delete this access code? Users with this code will no longer be able to register."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteCode}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteMarketId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteMarketId(null);
        }}
        title="Delete market location?"
        description="This location will be removed from the capture station selector for all users."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteMarket}
      />
    </>
  );
};

export default AdminDashboardDialogs;
