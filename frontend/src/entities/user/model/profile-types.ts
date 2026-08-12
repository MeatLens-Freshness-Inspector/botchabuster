export type ProfileDialogState = {
  showPasswordDialog: boolean;
  showPrivacyDialog: boolean;
  showSignOutConfirm: boolean;
  showTermsDialog: boolean;
};

export type ProfileDialogKey = keyof ProfileDialogState;

export function createProfileDialogState(): ProfileDialogState {
  return {
    showPasswordDialog: false,
    showPrivacyDialog: false,
    showSignOutConfirm: false,
    showTermsDialog: false,
  };
}
