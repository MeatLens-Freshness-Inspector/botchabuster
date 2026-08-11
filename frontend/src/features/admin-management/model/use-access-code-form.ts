import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { accessCodeClient, type AccessCode } from "@/entities/access-code";

interface UseAccessCodeFormOptions {
  setAccessCodes: Dispatch<SetStateAction<AccessCode[]>>;
}

export function useAccessCodeForm({ setAccessCodes }: UseAccessCodeFormOptions) {
  const [newCode, setNewCode] = useState("");
  const [newCodeDesc, setNewCodeDesc] = useState("");

  const handleCreateCode = async () => {
    if (!newCode.trim()) {
      toast.error("Code cannot be empty");
      return;
    }

    try {
      const created = await accessCodeClient.create(newCode.trim(), newCodeDesc.trim() || undefined);
      setAccessCodes((previous) => [created, ...previous]);
      setNewCode("");
      setNewCodeDesc("");
      toast.success("Access code created");
    } catch {
      toast.error("Failed to create code");
    }
  };

  return { handleCreateCode, newCode, newCodeDesc, setNewCode, setNewCodeDesc };
}
