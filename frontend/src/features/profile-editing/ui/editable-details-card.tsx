import { Loader2, UserRound } from "lucide-react";
import { Button } from "@/shared/ui";
import { Input } from "@/shared/ui";
import { Label } from "@/shared/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { REPORT_ORGANIZATION_OPTIONS } from "@/features/reports";
import type { ReportOrganization } from "@/entities/user/api/profile-client";

type ProfileEditableDetailsCardProps = {
  email: string;
  fullName: string;
  inspectorCode: string;
  isLightMode: boolean;
  isSavingProfile: boolean;
  isShowingDetailedResults: boolean;
  isUploadingAvatar: boolean;
  location: string;
  reportOrganization: ReportOrganization | null;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onReportOrganizationChange: (value: ReportOrganization) => void;
  onSaveProfile: () => void | Promise<void>;
  onLightModeChange: (value: boolean) => void;
  onDetailedResultsChange: (value: boolean) => void;
};

export function ProfileEditableDetailsCard({
  email,
  fullName,
  inspectorCode,
  isLightMode,
  isSavingProfile,
  isShowingDetailedResults,
  isUploadingAvatar,
  location,
  reportOrganization,
  onEmailChange,
  onFullNameChange,
  onLocationChange,
  onReportOrganizationChange,
  onSaveProfile,
  onLightModeChange,
  onDetailedResultsChange,
}: ProfileEditableDetailsCardProps) {
  return (
    <section
      data-testid="profile-detailed-info-card"
      className="order-1 flex h-full flex-col rounded-3xl border border-border/70 bg-card/90 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Detailed Information</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Update your account details and inspection preferences in one place. Your
            inspector code is assigned by an administrator and cannot be changed here.
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

        <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
          <Label
            htmlFor="profile-details-location"
            className="text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            Location
          </Label>
          <Input
            id="profile-details-location"
            value={location}
            onChange={(event) => onLocationChange(event.target.value)}
            className="mt-2 bg-background/65"
          />
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/55 p-3">
          <Label
            htmlFor="profile-details-organization"
            className="text-[11px] uppercase tracking-widest text-muted-foreground"
          >
            Report Organization
          </Label>
          <Select
            value={reportOrganization ?? undefined}
            onValueChange={(value) => onReportOrganizationChange(value as ReportOrganization)}
          >
            <SelectTrigger id="profile-details-organization" className="mt-2 bg-background/65">
              <SelectValue placeholder="Select report organization" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_ORGANIZATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 p-3">
          <div className="space-y-1">
            <Label htmlFor="profile-details-theme" className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Theme
            </Label>
            <p className="text-sm text-foreground">{isLightMode ? "Light mode" : "Dark mode"}</p>
          </div>
          <Switch
            id="profile-details-theme"
            checked={isLightMode}
            onCheckedChange={onLightModeChange}
            aria-label="Use light mode"
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/55 p-3">
          <div className="space-y-1">
            <Label htmlFor="profile-details-results" className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Inspect Result Detail
            </Label>
            <p className="text-sm text-foreground">
              {isShowingDetailedResults ? "Detailed" : "Simplified"}
            </p>
          </div>
          <Switch
            id="profile-details-results"
            checked={isShowingDetailedResults}
            onCheckedChange={onDetailedResultsChange}
            aria-label="Show detailed inspect results"
          />
        </div>
      </div>

      <div className="mt-auto flex justify-end pt-4">
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
      </div>
    </section>
  );
}
