import type { ChangeEventHandler } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Copy,
  Mail,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { Profile } from "@/integrations/api/ProfileClient";

type ProfileSummaryCardProps = {
  fullName: string;
  initials: string;
  inspectorCode: string;
  isUploadingAvatar: boolean;
  onAvatarUpload: ChangeEventHandler<HTMLInputElement>;
  onCopyCode: () => void | Promise<void>;
  profile: Profile | null;
  roleLabel: string;
};

export function ProfileSummaryCard({
  fullName,
  initials,
  inspectorCode,
  isUploadingAvatar,
  onAvatarUpload,
  onCopyCode,
  profile,
  roleLabel,
}: ProfileSummaryCardProps) {
  return (
    <section
      data-testid="profile-summary-card"
      className="rounded-[2rem] border border-border/70 bg-card/95 p-4 shadow-[0_22px_80px_-38px_rgba(0,0,0,0.65)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16 border-2 border-border/80">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt="Profile avatar" />
            <AvatarFallback className="font-display text-base uppercase tracking-wider">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-display text-2xl font-semibold leading-tight">
              {fullName || "Unnamed User"}
            </h2>
            <p className="text-sm text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] font-display uppercase tracking-widest text-primary">
          Active
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground"
        >
          <Mail className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground"
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-1 rounded-xl border border-border/70 bg-background/55 p-3">
          <Label
            htmlFor="profile-image"
            className="text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            Profile Image
          </Label>
          <Input
            id="profile-image"
            type="file"
            accept="image/*"
            onChange={onAvatarUpload}
            disabled={isUploadingAvatar}
            className="h-9 text-xs"
          />
        </div>
        <div className="rounded-xl border border-border/70 bg-background/55 p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Access Code
            </div>
            {profile?.inspector_code && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={onCopyCode}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            )}
          </div>
          <p className="break-words font-display text-sm tracking-widest">{inspectorCode}</p>
        </div>
      </div>
    </section>
  );
}
