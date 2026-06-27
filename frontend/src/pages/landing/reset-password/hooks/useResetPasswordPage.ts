import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getResetPasswordErrorMessage,
  resolveRecoverySession,
} from "../utils/resetPasswordPage";

export function useResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const { updatePasswordWithRecoveryToken } = useAuth();
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
      toast.success("Password updated!");
      navigate("/login");
    } catch (error) {
      toast.error(getResetPasswordErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
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
