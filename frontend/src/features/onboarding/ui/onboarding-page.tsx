import type { ReactNode } from "react";
import type { OnboardingPageViewModel } from "@/features/onboarding";

type OnboardingPageViewProps = OnboardingPageViewModel & { tutorial: ReactNode };

export function OnboardingPageView({ tutorial }: OnboardingPageViewProps) {
  return tutorial;
}
