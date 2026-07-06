import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScopeDelimitationsContent } from "@/components/help/ScopeDelimitationsContent";
import { scopeReferencePage } from "@/lib/help/scopeDelimitationsContent";

const ProfileHelpScopePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_36%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto max-w-4xl px-4 pt-4">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-card/85 px-3 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => navigate("/profile/help")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-background"
            aria-label="Go back to help tutorials"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              {scopeReferencePage.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {scopeReferencePage.description}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/92 px-5 py-5 shadow-[0_18px_55px_-34px_rgba(0,0,0,0.55)]">
          <ScopeDelimitationsContent />
        </div>
      </div>
    </div>
  );
};

export default ProfileHelpScopePage;
