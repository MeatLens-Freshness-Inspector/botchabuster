export type ProfileDialogState = {
  showPrivacyDialog: boolean;
  showSignOutConfirm: boolean;
  showTermsDialog: boolean;
};

export type ProfileDialogKey = keyof ProfileDialogState;
