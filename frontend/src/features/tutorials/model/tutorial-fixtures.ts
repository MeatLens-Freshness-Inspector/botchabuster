export type TutorialFixtureKey = "profile" | "inspect" | "history" | "messages";

export interface TutorialProfileFixture {
  isSimulated: true;
  displayName: "Tutorial example";
  emailLabel: "Example inspector account";
  accessCodeLabel: "Example access code";
}

export interface TutorialInspectFixture {
  isSimulated: true;
  locationLabel: "Dagupan City Slaughterhouse";
  captureStatus: "Ready";
  analysisStatus: "Awaiting";
  confidenceLabel: "--";
  modelStatus: "Model ready";
}

export interface TutorialHistoryFixture {
  isSimulated: true;
  classification: "Fresh";
  confidenceLabel: "94%";
  locationLabel: "Dagupan City Slaughterhouse";
  recordLabel: "Tutorial sample inspection";
}

export interface TutorialMessagesFixture {
  isSimulated: true;
  connectionStatus: "connected";
  contactLabel: "Inspection support contact";
  contactRoleLabel: "Admin Contact";
  messageCountLabel: "0 messages";
}

export const tutorialFixtures: Record<TutorialFixtureKey, {
  profile: TutorialProfileFixture;
  inspect: TutorialInspectFixture;
  history: TutorialHistoryFixture;
  messages: TutorialMessagesFixture;
}>[TutorialFixtureKey] = {
  profile: {
    isSimulated: true,
    displayName: "Tutorial example",
    emailLabel: "Example inspector account",
    accessCodeLabel: "Example access code",
  },
  inspect: {
    isSimulated: true,
    locationLabel: "Dagupan City Slaughterhouse",
    captureStatus: "Ready",
    analysisStatus: "Awaiting",
    confidenceLabel: "--",
    modelStatus: "Model ready",
  },
  history: {
    isSimulated: true,
    classification: "Fresh",
    confidenceLabel: "94%",
    locationLabel: "Dagupan City Slaughterhouse",
    recordLabel: "Tutorial sample inspection",
  },
  messages: {
    isSimulated: true,
    connectionStatus: "connected",
    contactLabel: "Inspection support contact",
    contactRoleLabel: "Admin Contact",
    messageCountLabel: "0 messages",
  },
};
