import { ArrowLeft, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TutorialPlayer } from "@/components/tutorial/TutorialPlayer";
import type { ProfileHelpPageViewModel } from "../types";
import {
  PROFILE_HELP_DESCRIPTION,
  PROFILE_HELP_TITLE,
} from "../utils/tutorialPages";

type ProfileHelpPageViewProps = ProfileHelpPageViewModel;

export function ProfileHelpPageView({
  activeDemo,
  activeDemoSteps,
  activeDemoTitle,
  cards,
  closeActiveDemo,
  navigateBack,
  openDemo,
}: ProfileHelpPageViewProps) {
  if (activeDemo && activeDemoSteps) {
    return (
      <TutorialPlayer
        steps={activeDemoSteps}
        finishLabel="Back to Help"
        completionTitle={`${activeDemoTitle} complete`}
        completionBody="This replay used simulated data only and did not change your account."
        onFinish={closeActiveDemo}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_36%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 px-3 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={navigateBack}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-background"
            aria-label="Go back to profile"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              {PROFILE_HELP_TITLE}
            </h1>
            <p className="text-xs text-muted-foreground">
              {PROFILE_HELP_DESCRIPTION}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Card
              key={card.id}
              className="rounded-3xl border border-border/70 bg-card/92 shadow-[0_18px_55px_-34px_rgba(0,0,0,0.55)]"
            >
              <CardHeader className="space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.14)]">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="font-display text-lg uppercase tracking-[0.12em]">
                  {card.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {card.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  className="h-10 rounded-xl px-5"
                  onClick={() => openDemo(card.id)}
                >
                  Open {card.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
