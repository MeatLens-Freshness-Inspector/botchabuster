export const ONBOARDING_COMPLETION_TITLE = "You're ready to inspect";

export const ONBOARDING_COMPLETION_BODY =
  "You can start using MeatLens now and replay these demos later from Profile > Help.";

export const ONBOARDING_FINISH_LABEL = "Start Inspecting";

export const ONBOARDING_SECONDARY_ACTION_LABEL = "Open Help";

export function getOnboardingErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to finish onboarding";
}
