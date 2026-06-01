import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  helpTutorialCards,
  isTutorialId,
  tutorialDefinitions,
} from "@/lib/tutorials/tutorialDefinitions";

const ProfileHelpPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <Navigate to="/profile" replace />;
  }

  const demoParam = searchParams.get("demo");
  const activeDemo = isTutorialId(demoParam) ? demoParam : null;

  if (activeDemo) {
    const card = helpTutorialCards.find((item) => item.id === activeDemo);

    return (
      <TutorialPlayer
        steps={tutorialDefinitions[activeDemo]}
        finishLabel="Back to Help"
        completionTitle={`${card?.title ?? "Tutorial"} complete`}
        completionBody="This replay used simulated data only and did not change your account."
        onFinish={() => setSearchParams({})}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_36%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 px-3 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-background"
            aria-label="Go back to profile"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Help Tutorials
            </h1>
            <p className="text-xs text-muted-foreground">
              Replay safe guided demos anytime.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {helpTutorialCards.map((card) => (
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
                  onClick={() => setSearchParams({ demo: card.id })}
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
};

export default ProfileHelpPage;
