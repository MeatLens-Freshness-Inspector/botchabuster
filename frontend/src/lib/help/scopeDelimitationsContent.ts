export const scopeReferencePath = "/profile/help/scope" as const;

export interface ScopeReferenceSection {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
}

export const inspectScopeReminder = {
  title: "Scope and Delimitations",
  description: "Use MeatLens only for pork screening during active inspection work.",
  bullets: [
    "Pork samples only",
    "Field screening support only",
    "Not a lab diagnosis",
    "Not a legal certification tool",
    "Final decision stays with the inspector",
  ],
  ctaLabel: "View full scope and delimitations",
};

export const scopeReferencePage = {
  title: "Scope and Delimitations",
  description:
    "Review the current operating boundaries for MeatLens before relying on the AI result.",
  sections: [
    {
      id: "system-scope",
      title: "System scope",
      body: [
        "MeatLens currently provides pork inspection support only.",
        "The current product scope is limited to inspector-facing pork freshness screening inside the MeatLens workflow.",
      ],
    },
    {
      id: "included-workflow",
      title: "Included workflow",
      body: [
        "Use MeatLens during field capture, AI-assisted freshness review, and inspection documentation.",
        "The system supports on-site screening, not stand-alone certification or final enforcement.",
      ],
    },
    {
      id: "excluded-meat-types",
      title: "Excluded meat types and cases",
      body: [
        "This version is not validated for beef, poultry, fish, or other non-pork categories.",
      ],
      bullets: [
        "Do not treat non-pork samples as supported inputs.",
        "Do not generalize pork-only outputs to other meat types.",
      ],
    },
    {
      id: "operational-delimitations",
      title: "Operational delimitations",
      body: [
        "MeatLens is field screening support only.",
        "MeatLens is not a lab diagnosis and not a legal certification tool.",
      ],
    },
    {
      id: "inspector-responsibilities",
      title: "Inspector responsibilities",
      body: [
        "Final inspection judgment remains with the inspector under official protocol.",
        "The AI result must not be the only basis for enforcement action.",
      ],
    },
    {
      id: "when-not-to-rely-on-ai-alone",
      title: "When not to rely on the AI result alone",
      body: [
        "Escalate to manual judgment or laboratory confirmation when official LGU or institutional procedure requires it.",
      ],
      bullets: [
        "Non-pork samples",
        "Cases requiring laboratory confirmation",
        "Situations where official procedure overrides the AI output",
      ],
    },
  ] satisfies ScopeReferenceSection[],
};
