import { KeyRound, Loader2, UserRound } from "lucide-react";
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
import { REPORT_ORGANIZATION_OPTIONS } from "@/features/reports";
import type { ReportOrganization } from "@/entities/user/api/profile-client";

type ProfileEditableDetailsCardProps = {
  email: string;
  fullName: string;
  isSavingProfile: boolean;
  isUploadingAvatar: boolean;
  location: string;
  reportOrganization: ReportOrganization | null;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onReportOrganizationChange: (value: ReportOrganization) => void;
  onOpenPasswordDialog: () => void;
  onSaveProfile: () => void | Promise<void>;
};

export function ProfileEditableDetailsCard({
  email,
  fullName,
  isSavingProfile,
  isUploadingAvatar,
  location,
  reportOrganization,
  onEmailChange,
  onFullNameChange,
  onLocationChange,
  onReportOrganizationChange,
  onOpenPasswordDialog,
  onSaveProfile,
}: ProfileEditableDetailsCardProps) {
  return (
    <section
      data-testid="profile-detailed-info-card"
      className="order-1 flex flex-col rounded-3xl border border-border/70 bg-card/90 p-4 lg:h-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Detailed Information</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Update your account details in one place. Your
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

      <div className="mt-auto flex flex-nowrap justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onOpenPasswordDialog}
          className="min-w-0 flex-1 whitespace-nowrap rounded-xl px-2 text-[10px] uppercase tracking-[0.08em] md:flex-none md:px-4 md:text-xs md:tracking-widest"
        >
          <KeyRound className="mr-2 h-4 w-4" />
          Change Password
        </Button>
        <Button
          type="button"
          onClick={onSaveProfile}
          disabled={isSavingProfile || isUploadingAvatar}
          className="min-w-0 flex-1 whitespace-nowrap rounded-xl px-2 text-[10px] uppercase tracking-[0.08em] md:flex-none md:px-5 md:text-xs md:tracking-widest"
        >
          {isSavingProfile ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserRound className="mr-2 h-4 w-4" />
          )}
          Save Profile
        </Button>
      </div>

    </section>
  );
}
