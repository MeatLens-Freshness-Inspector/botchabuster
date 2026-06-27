import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getForgotPasswordErrorMessage } from "../utils/forgotPasswordPage";

export function useForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
      toast.success("Reset link sent!");
    } catch (error) {
      toast.error(getForgotPasswordErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    loading,
    sent,
    setEmail,
    handleSubmit,
  };
}
