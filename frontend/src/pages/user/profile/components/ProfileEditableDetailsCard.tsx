import { Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileEditableDetailsCardProps = {
  email: string;
  fullName: string;
  inspectorCode: string;
  isLightMode: boolean;
  isSavingProfile: boolean;
  isShowingDetailedResults: boolean;
  isUploadingAvatar: boolean;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onSaveProfile: () => void | Promise<void>;
};

export function ProfileEditableDetailsCard({
  email,
  fullName,
  inspectorCode,
  isLightMode,
  isSavingProfile,
  isShowingDetailedResults,
  isUploadingAvatar,
  onEmailChange,
  onFullNameChange,
  onSaveProfile,
}: ProfileEditableDetailsCardProps) {
  return (
    <section
      data-testid="profile-detailed-info-card"
      className="rounded-3xl border border-border/70 bg-card/90 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Detailed Information</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Keep your identity details current while preserving your inspection profile
            preferences below.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
          <Label
            htmlFor="profile-details-name"
            className="text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            Name
          </Label>
          <Input
            id="profile-details-name"
            value={fullName}
            onChange={(event) => onFullNameChange(event.target.value)}
            className="mt-2 bg-background/65"
          />
        </div>

        <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.14)] p-3">
          <Label
            htmlFor="profile-details-email"
            className="text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            Email
          </Label>
          <Input
            id="profile-details-email"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="mt-2 bg-background/65"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button
          onClick={onSaveProfile}
          disabled={isSavingProfile || isUploadingAvatar}
          className="h-10 rounded-xl px-5 font-display text-xs uppercase tracking-widest"
        >
          {isSavingProfile ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserRound className="mr-2 h-4 w-4" />
          )}
          Save Profile
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Inspector Code
          </p>
          <p className="text-sm font-medium">{inspectorCode}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Theme</p>
          <p className="text-sm font-medium">{isLightMode ? "Light Mode" : "Dark Mode"}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Inspect Result Detail
          </p>
          <p className="text-sm font-medium">
            {isShowingDetailedResults ? "Detailed" : "Simplified"}
          </p>
        </div>
      </div>
    </section>
  );
}
