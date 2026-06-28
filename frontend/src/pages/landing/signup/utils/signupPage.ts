import { isReportOrganization } from "@/lib/reportOrganizations";

export function validateSignupState(input: {
  acceptedPrivacy: boolean;
  acceptedTerms: boolean;
  accessCode: string;
  reportOrganization: string;
}): string | null {
  if (!input.acceptedTerms) {
    return "Please accept the Terms and Conditions before creating an account.";
  }

  if (!input.acceptedPrivacy) {
    return "Please accept the Privacy Policy before creating an account.";
  }

  if (!input.accessCode.trim()) {
    return "Access code is required.";
  }

  if (!isReportOrganization(input.reportOrganization)) {
    return "Please select the report header organization before creating an account.";
  }

  return null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
