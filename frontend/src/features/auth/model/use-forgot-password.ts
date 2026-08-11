import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getForgotPasswordErrorMessage } from "./forgot-password";

export interface ForgotPasswordDependencies {
  resetPassword: (email: string) => Promise<void>;
}

export function useForgotPasswordPage({ resetPassword }: ForgotPasswordDependencies) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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
