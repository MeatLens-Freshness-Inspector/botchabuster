export type ProfileDialogState = {
  showPrivacyDialog: boolean;
  showSignOutConfirm: boolean;
  showTermsDialog: boolean;
};

export type ProfileDialogKey = keyof ProfileDialogState;

export function createProfileDialogState(): ProfileDialogState {
  return {
    showPrivacyDialog: false,
    showSignOutConfirm: false,
    showTermsDialog: false,
  };
}
