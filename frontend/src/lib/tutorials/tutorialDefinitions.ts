export type TutorialId = "safety" | "profile" | "inspect" | "history";

export interface TutorialBlockDefinition {
  id: string;
  title: string;
  description: string;
  tone?: "neutral" | "accent" | "warning";
  hotspotLabel?: string;
}

export interface TutorialStepDefinition {
  id: string;
  tutorialId: TutorialId;
  sectionTitle: string;
  stepTitle: string;
  instruction: string;
  sceneTitle: string;
  sceneSubtitle: string;
  hotspotLabel: string;
  blocks: TutorialBlockDefinition[];
}

export interface HelpTutorialCardDefinition {
  id: TutorialId;
  title: string;
  description: string;
}

export const tutorialDefinitions: Record<TutorialId, TutorialStepDefinition[]> = {
  safety: [
    {
      id: "safety-acknowledge",
      tutorialId: "safety",
      sectionTitle: "Safety acknowledgement",
      stepTitle: "Read the reminder before you inspect",
      instruction:
        "Tap the highlighted acknowledgement to confirm that MeatLens supports, but does not replace, your official field judgment.",
      sceneTitle: "Inspection Reminder",
      sceneSubtitle: "Before you inspect",
      hotspotLabel: "I understand the reminder",
      blocks: [
        {
          id: "safety-warning",
          title: "Official protocol still applies",
          description:
            "Use MeatLens as decision support only and keep final decisions aligned with your LGU or institutional procedure.",
          tone: "warning",
        },
        {
          id: "safety-acknowledge",
          title: "Acknowledge the reminder",
          description: "Confirm the safety reminder to continue into the tutorial.",
          tone: "accent",
          hotspotLabel: "I understand the reminder",
        },
      ],
    },
  ],
  profile: [
    {
      id: "profile-account-details",
      tutorialId: "profile",
      sectionTitle: "Profile walkthrough",
      stepTitle: "Find your account details",
      instruction:
        "This is a simulated profile page. Tap the highlighted account summary to learn where your name and email live.",
      sceneTitle: "My Profile",
      sceneSubtitle: "Inspector account center",
      hotspotLabel: "Show my account details",
      blocks: [
        {
          id: "profile-summary",
          title: "Account details",
          description: "Review your display name and account email here.",
          tone: "accent",
          hotspotLabel: "Show my account details",
        },
        {
          id: "profile-access-code",
          title: "Inspector code",
          description: "Your assigned access code stays visible in Profile.",
        },
        {
          id: "profile-help",
          title: "Help tutorials",
          description: "Replay guided demos later from here.",
        },
      ],
    },
    {
      id: "profile-access-code",
      tutorialId: "profile",
      sectionTitle: "Profile walkthrough",
      stepTitle: "Find your access code",
      instruction:
        "Tap the highlighted access-code area to learn where your assigned inspector code is shown.",
      sceneTitle: "My Profile",
      sceneSubtitle: "Inspector account center",
      hotspotLabel: "Show my access code",
      blocks: [
        {
          id: "profile-summary",
          title: "Account details",
          description: "Review your display name and account email here.",
        },
        {
          id: "profile-access-code",
          title: "Inspector code",
          description: "Your assigned access code stays visible in Profile.",
          tone: "accent",
          hotspotLabel: "Show my access code",
        },
        {
          id: "profile-help",
          title: "Help tutorials",
          description: "Replay guided demos later from here.",
        },
      ],
    },
    {
      id: "profile-help",
      tutorialId: "profile",
      sectionTitle: "Profile walkthrough",
      stepTitle: "Find help later",
      instruction:
        "Tap the highlighted help area to learn where you can reopen these guided demos after onboarding.",
      sceneTitle: "My Profile",
      sceneSubtitle: "Inspector account center",
      hotspotLabel: "Open help from profile",
      blocks: [
        {
          id: "profile-summary",
          title: "Account details",
          description: "Review your display name and account email here.",
        },
        {
          id: "profile-access-code",
          title: "Inspector code",
          description: "Your assigned access code stays visible in Profile.",
        },
        {
          id: "profile-help",
          title: "Help tutorials",
          description: "Replay guided demos later from here.",
          tone: "accent",
          hotspotLabel: "Open help from profile",
        },
      ],
    },
  ],
  inspect: [
    {
      id: "inspect-market",
      tutorialId: "inspect",
      sectionTitle: "Inspect demo",
      stepTitle: "Choose the active market",
      instruction:
        "Tap the highlighted market selector first. Inspect always starts by confirming the active location.",
      sceneTitle: "Inspect",
      sceneSubtitle: "Field capture workflow",
      hotspotLabel: "Choose market",
      blocks: [
        {
          id: "inspect-market",
          title: "Market selector",
          description: "Set the active inspection location before capture.",
          tone: "accent",
          hotspotLabel: "Choose market",
        },
        {
          id: "inspect-capture",
          title: "Capture sample",
          description: "Open the guided camera flow to frame the meat sample.",
        },
        {
          id: "inspect-analysis",
          title: "Run analysis",
          description: "Review the classification and confidence after capture.",
        },
        {
          id: "inspect-save",
          title: "Save result",
          description: "Store the finished inspection record after review.",
        },
      ],
    },
    {
      id: "inspect-capture",
      tutorialId: "inspect",
      sectionTitle: "Inspect demo",
      stepTitle: "Open capture",
      instruction:
        "Tap the highlighted capture action to continue through the simulated inspection flow.",
      sceneTitle: "Inspect",
      sceneSubtitle: "Field capture workflow",
      hotspotLabel: "Open capture",
      blocks: [
        {
          id: "inspect-market",
          title: "Market selector",
          description: "Set the active inspection location before capture.",
        },
        {
          id: "inspect-capture",
          title: "Capture sample",
          description: "Open the guided camera flow to frame the meat sample.",
          tone: "accent",
          hotspotLabel: "Open capture",
        },
        {
          id: "inspect-analysis",
          title: "Run analysis",
          description: "Review the classification and confidence after capture.",
        },
        {
          id: "inspect-save",
          title: "Save result",
          description: "Store the finished inspection record after review.",
        },
      ],
    },
    {
      id: "inspect-analysis",
      tutorialId: "inspect",
      sectionTitle: "Inspect demo",
      stepTitle: "Run analysis",
      instruction:
        "Tap the highlighted analysis step to review the simulated freshness result.",
      sceneTitle: "Inspect",
      sceneSubtitle: "Field capture workflow",
      hotspotLabel: "Run analysis",
      blocks: [
        {
          id: "inspect-market",
          title: "Market selector",
          description: "Set the active inspection location before capture.",
        },
        {
          id: "inspect-capture",
          title: "Capture sample",
          description: "Open the guided camera flow to frame the meat sample.",
        },
        {
          id: "inspect-analysis",
          title: "Run analysis",
          description: "Review the classification and confidence after capture.",
          tone: "accent",
          hotspotLabel: "Run analysis",
        },
        {
          id: "inspect-save",
          title: "Save result",
          description: "Store the finished inspection record after review.",
        },
      ],
    },
    {
      id: "inspect-save",
      tutorialId: "inspect",
      sectionTitle: "Inspect demo",
      stepTitle: "Save the result",
      instruction:
        "Tap the highlighted save action to complete the simulated inspection run.",
      sceneTitle: "Inspect",
      sceneSubtitle: "Field capture workflow",
      hotspotLabel: "Save result",
      blocks: [
        {
          id: "inspect-market",
          title: "Market selector",
          description: "Set the active inspection location before capture.",
        },
        {
          id: "inspect-capture",
          title: "Capture sample",
          description: "Open the guided camera flow to frame the meat sample.",
        },
        {
          id: "inspect-analysis",
          title: "Run analysis",
          description: "Review the classification and confidence after capture.",
        },
        {
          id: "inspect-save",
          title: "Save result",
          description: "Store the finished inspection record after review.",
          tone: "accent",
          hotspotLabel: "Save result",
        },
      ],
    },
  ],
  history: [
    {
      id: "history-open-record",
      tutorialId: "history",
      sectionTitle: "History demo",
      stepTitle: "Open a saved inspection",
      instruction:
        "Tap the highlighted record to open a previously saved inspection from History.",
      sceneTitle: "History",
      sceneSubtitle: "Saved inspection records",
      hotspotLabel: "Open a saved inspection",
      blocks: [
        {
          id: "history-record",
          title: "Saved inspection record",
          description: "Open a record to revisit its stored findings.",
          tone: "accent",
          hotspotLabel: "Open a saved inspection",
        },
        {
          id: "history-confidence",
          title: "Freshness details",
          description: "Review the saved classification, confidence, and explanation.",
        },
        {
          id: "history-back",
          title: "Return to list",
          description: "Go back to the history list after review.",
        },
      ],
    },
    {
      id: "history-review-details",
      tutorialId: "history",
      sectionTitle: "History demo",
      stepTitle: "Review the freshness details",
      instruction:
        "Tap the highlighted details area to learn what you can review from a saved inspection.",
      sceneTitle: "Inspection Details",
      sceneSubtitle: "Saved result review",
      hotspotLabel: "Review the freshness details",
      blocks: [
        {
          id: "history-record",
          title: "Classification",
          description: "Fresh",
        },
        {
          id: "history-confidence",
          title: "Confidence and explanation",
          description: "Review the stored confidence score and explanation here.",
          tone: "accent",
          hotspotLabel: "Review the freshness details",
        },
        {
          id: "history-back",
          title: "Back to history",
          description: "Return to the saved-inspection list after review.",
        },
      ],
    },
    {
      id: "history-back-to-list",
      tutorialId: "history",
      sectionTitle: "History demo",
      stepTitle: "Return to the history list",
      instruction:
        "Tap the highlighted back action to finish the History walkthrough.",
      sceneTitle: "Inspection Details",
      sceneSubtitle: "Saved result review",
      hotspotLabel: "Return to the history list",
      blocks: [
        {
          id: "history-record",
          title: "Classification",
          description: "Fresh",
        },
        {
          id: "history-confidence",
          title: "Confidence and explanation",
          description: "Review the stored confidence score and explanation here.",
        },
        {
          id: "history-back",
          title: "Back to history",
          description: "Return to the saved-inspection list after review.",
          tone: "accent",
          hotspotLabel: "Return to the history list",
        },
      ],
    },
  ],
};

export const firstRunTutorialOrder: TutorialId[] = [
  "safety",
  "profile",
  "inspect",
  "history",
];

export const firstRunOnboardingSteps: TutorialStepDefinition[] =
  firstRunTutorialOrder.flatMap((id) => tutorialDefinitions[id]);

export const helpTutorialCards: HelpTutorialCardDefinition[] = [
  {
    id: "inspect",
    title: "Inspect Demo",
    description:
      "Practice the capture-to-save inspection path in a safe simulated flow.",
  },
  {
    id: "history",
    title: "History Demo",
    description:
      "Review where saved inspections live and what details can be checked later.",
  },
  {
    id: "safety",
    title: "Safety Reminder",
    description:
      "Replay the inspection safety reminder and decision-support notice.",
  },
  {
    id: "profile",
    title: "Profile Walkthrough",
    description:
      "Review where your account details, access code, and Help entry live.",
  },
];

export function isTutorialId(value: string | null): value is TutorialId {
  return (
    value === "safety" ||
    value === "profile" ||
    value === "inspect" ||
    value === "history"
  );
}
