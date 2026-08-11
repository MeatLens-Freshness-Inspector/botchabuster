export interface OnboardingSecondaryAction {
  label: string;
  onClick: () => void;
}

export interface OnboardingPageViewModel {
  errorMessage: string | null;
  isBusy: boolean;
  onFinish: () => void;
  onSkip: () => void;
  secondaryAction: OnboardingSecondaryAction;
}
