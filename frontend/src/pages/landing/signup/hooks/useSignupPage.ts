import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getErrorMessage,
  validateSignupState,
} from "../utils/signupPage";

export function useSignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [termsError, setTermsError] = useState("");
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateSignupState({
      acceptedPrivacy,
      acceptedTerms,
      accessCode,
    });

    if (validationError) {
      setTermsError(validationError);
      toast.error(validationError);
      return;
    }

    setTermsError("");
    setLoading(true);

    try {
      await signUp(email, password, fullName, accessCode.trim());
      toast.success("Account created! Check your email to verify.");
      navigate("/login");
    } catch (error) {
      toast.error(getErrorMessage(error, "Sign up failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptedTermsChange = (checked: boolean) => {
    setAcceptedTerms(checked);
    if (checked) {
      setTermsError("");
    }
  };

  const handleAcceptedPrivacyChange = (checked: boolean) => {
    setAcceptedPrivacy(checked);
    if (checked) {
      setTermsError("");
    }
  };

  return {
    fullName,
    email,
    password,
    accessCode,
    acceptedTerms,
    acceptedPrivacy,
    termsError,
    showTermsDialog,
    showPrivacyDialog,
    loading,
    setFullName,
    setEmail,
    setPassword,
    setAccessCode,
    setShowTermsDialog,
    setShowPrivacyDialog,
    handleSubmit,
    handleAcceptedTermsChange,
    handleAcceptedPrivacyChange,
  };
}
