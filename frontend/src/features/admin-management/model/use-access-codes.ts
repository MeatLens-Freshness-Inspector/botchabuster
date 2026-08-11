import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { accessCodeClient, type AccessCode } from "@/entities/access-code";

interface UseAccessCodesOptions {
  setAccessCodes: Dispatch<SetStateAction<AccessCode[]>>;
}

export function useAccessCodes({ setAccessCodes }: UseAccessCodesOptions) {
  const [pendingDeleteCodeId, setPendingDeleteCodeId] = useState<string | null>(null);

  const handleDeleteCode = async (id: string) => setPendingDeleteCodeId(id);

  const confirmDeleteCode = async () => {
    const id = pendingDeleteCodeId;
    if (!id) return;
    setPendingDeleteCodeId(null);

    try {
      await accessCodeClient.delete(id);
      setAccessCodes((previous) => previous.filter((code) => code.id !== id));
      toast.success("Code deleted");
    } catch {
      toast.error("Failed to delete code");
    }
  };

  const handleToggleCode = async (id: string, active: boolean) => {
    try {
      await accessCodeClient.toggleActive(id, active);
      setAccessCodes((previous) => previous.map((code) => (code.id === id ? { ...code, is_active: active } : code)));
    } catch {
      toast.error("Failed to update code");
    }
  };

  return { confirmDeleteCode, handleDeleteCode, handleToggleCode, pendingDeleteCodeId, setPendingDeleteCodeId };
}
