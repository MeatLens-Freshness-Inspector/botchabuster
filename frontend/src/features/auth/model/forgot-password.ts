export function getForgotPasswordErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Failed to send reset link";
}
