import { format } from "date-fns";
import { CalendarDays, CheckCircle2, User } from "lucide-react";

type ProfilePageHeaderProps = {
  roleLabel?: string;
  inspectorCode?: string;
  passkeysCount?: number;
};

export function ProfilePageHeader({
  roleLabel = "Inspector",
  inspectorCode = "--",
  passkeysCount = 0,
}: ProfilePageHeaderProps) {
  return (
    <section className="mb-4 rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">My Profile</h1>
            <p className="text-xs text-muted-foreground">Inspector account center</p>
          </div>
        </div>

        <div className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
          <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
          {format(new Date(), "MMMM yyyy")}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)] p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Account Role
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{roleLabel}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Account Status
          </p>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-display text-2xl font-semibold">Active</p>
            <CheckCircle2 className="h-4 w-4 text-fresh" />
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Inspector Code
          </p>
          <p className="mt-1 break-words font-display text-xl font-semibold leading-tight">
            {inspectorCode}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Passkeys Enrolled
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{passkeysCount}</p>
        </div>
      </div>
    </section>
  );
}

