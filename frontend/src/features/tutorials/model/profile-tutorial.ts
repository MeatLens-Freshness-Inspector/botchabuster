import type { TutorialId } from "./inspection-tutorial";

const scopeReferencePath = "/profile/help/scope" as const;

export interface HelpTutorialCardDefinition {
  kind: "tutorial";
  id: TutorialId;
  title: string;
  description: string;
  buttonLabel?: string;
}

export interface HelpReferenceCardDefinition {
  kind: "reference";
  id: "scope";
  title: string;
  description: string;
  href: typeof scopeReferencePath;
  buttonLabel: string;
}

export type HelpCardDefinition =
  | HelpTutorialCardDefinition
  | HelpReferenceCardDefinition;

export const helpTutorialCards: HelpTutorialCardDefinition[] = [
  {
    kind: "tutorial",
    id: "inspect",
    title: "Inspect Demo",
    description:
      "Practice the capture-to-save inspection path in a safe simulated flow.",
  },
  {
    kind: "tutorial",
    id: "history",
    title: "History Demo",
    description:
      "Review where saved inspections live and what details can be checked later.",
  },
  {
    kind: "tutorial",
    id: "safety",
    title: "Safety Reminder",
    description:
      "Replay the inspection safety reminder and decision-support notice.",
  },
  {
    kind: "tutorial",
    id: "profile",
    title: "Profile Walkthrough",
    description:
      "Review where your account details, access code, and Help entry live.",
  },
];

export const helpCards: HelpCardDefinition[] = [
  ...helpTutorialCards,
  {
    kind: "reference",
    id: "scope",
    title: "Scope and Delimitations",
    description:
      "Review the current pork-only boundaries, excluded cases, and inspector responsibilities.",
    href: scopeReferencePath,
    buttonLabel: "Open Scope and Delimitations",
  },
];

export function isTutorialId(value: string | null): value is TutorialId {
  return value === "safety" || value === "profile" || value === "inspect" || value === "history";
}
