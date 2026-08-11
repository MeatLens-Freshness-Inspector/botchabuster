import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { clearStoredRecoveryAccessToken } from "@/shared/api";
import {
  getResetPasswordErrorMessage,
  resolveRecoverySession,
} from "./reset-password";

export interface ResetPasswordDependencies {
  updatePasswordWithRecoveryToken: (accessToken: string, password: string) => Promise<void>;
}

export function useResetPasswordPage({ updatePasswordWithRecoveryToken }: ResetPasswordDependencies) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const recoverySession = resolveRecoverySession(window.location.hash);

    setIsRecovery(recoverySession.isRecovery);
    setAccessToken(recoverySession.accessToken);

    if (recoverySession.shouldClearHash && window.location.hash) {
      window.history.replaceState(
        window.history.state,
        document.title,
        `${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      await updatePasswordWithRecoveryToken(accessToken, password);
      clearStoredRecoveryAccessToken();
      toast.success("Password updated!");
      navigate("/login");
    } catch (error) {
      toast.error(getResetPasswordErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    clearStoredRecoveryAccessToken();
    navigate("/login");
  };

  return {
    password,
    confirm,
    loading,
    isRecovery,
    setPassword,
    setConfirm,
    handleSubmit,
    handleBackToSignIn,
  };
}
