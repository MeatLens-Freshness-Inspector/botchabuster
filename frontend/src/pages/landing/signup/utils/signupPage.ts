export function validateSignupState(input: {
  acceptedPrivacy: boolean;
  acceptedTerms: boolean;
  accessCode: string;
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

  return null;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
