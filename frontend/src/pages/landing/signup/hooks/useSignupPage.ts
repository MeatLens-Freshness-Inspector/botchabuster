import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  isReportOrganization,
  type ReportOrganization,
} from "@/lib/reportOrganizations";
import {
  getErrorMessage,
  validateSignupState,
} from "../utils/signupPage";

export function useSignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [reportOrganization, setReportOrganization] = useState<
    ReportOrganization | ""
  >("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [formError, setFormError] = useState("");
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
      reportOrganization,
    });

    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    if (!isReportOrganization(reportOrganization)) {
      setFormError("Please select the report header organization before creating an account.");
      return;
    }

    setFormError("");
    setLoading(true);

    try {
      await signUp(
        email,
        password,
        fullName,
        accessCode.trim(),
        reportOrganization,
      );
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
      setFormError("");
    }
  };

  const handleAcceptedPrivacyChange = (checked: boolean) => {
    setAcceptedPrivacy(checked);
    if (checked) {
      setFormError("");
    }
  };

  return {
    fullName,
    email,
    password,
    accessCode,
    reportOrganization,
    acceptedTerms,
    acceptedPrivacy,
    formError,
    showTermsDialog,
    showPrivacyDialog,
    loading,
    setFullName,
    setEmail,
    setPassword,
    setAccessCode,
    setReportOrganization,
    setShowTermsDialog,
    setShowPrivacyDialog,
    handleSubmit,
    handleAcceptedTermsChange,
    handleAcceptedPrivacyChange,
  };
}
