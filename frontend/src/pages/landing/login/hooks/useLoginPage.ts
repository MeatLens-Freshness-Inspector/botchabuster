import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { canUsePasskeys } from "@/lib/passkeys/browser";
import {
  getAuthDestination,
  getErrorMessage,
} from "../utils/loginPage";

export function useLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const {
    canUnlockWithLocalPasskey,
    offlineUnlockRequired,
    signIn,
    signInWithPasskey,
    unlockWithLocalPasskey,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkPasskeyAvailability = async () => {
      const supported = await canUsePasskeys();
      if (mounted) {
        setPasskeyAvailable(supported);
      }
    };

    void checkPasskeyAvailability();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { isAdmin } = await signIn(email, password);
      navigate(getAuthDestination(isAdmin));
    } catch (error) {
      toast.error(getErrorMessage(error, "Sign in failed"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySignIn = async () => {
    setPasskeyLoading(true);

    try {
      const { isAdmin } = await signInWithPasskey();
      navigate(getAuthDestination(isAdmin));
    } catch (error) {
      toast.error(getErrorMessage(error, "Passkey sign in failed"));
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleLocalPasskeyUnlock = async () => {
    setPasskeyLoading(true);

    try {
      const { isAdmin } = await unlockWithLocalPasskey();
      navigate(getAuthDestination(isAdmin));
    } catch (error) {
      toast.error(getErrorMessage(error, "Passkey unlock failed"));
    } finally {
      setPasskeyLoading(false);
    }
  };

  return {
    email,
    password,
    loading,
    passkeyLoading,
    passkeyAvailable,
    setEmail,
    setPassword,
    handleSubmit,
    handlePasskeySignIn,
    handleLocalPasskeyUnlock,
    showOfflinePasskeyUnlock:
      offlineUnlockRequired && passkeyAvailable && canUnlockWithLocalPasskey,
  };
}
