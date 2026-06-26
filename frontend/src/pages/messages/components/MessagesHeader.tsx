import { format } from "date-fns";
import { CalendarDays, MessageSquare } from "lucide-react";
import { formatTimestamp } from "../utils/formatters";

type MessagesHeaderProps = {
  isAdmin: boolean;
  totalContacts: number;
  adminContacts: number;
  userContacts: number;
  latestActivity: string | null;
};

export function MessagesHeader({
  isAdmin,
  totalContacts,
  adminContacts,
  userContacts,
  latestActivity,
}: MessagesHeaderProps) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/90 p-4 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.65)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-[hsl(var(--primary)/0.16)]">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">Messages</h1>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "Coordinate directly with inspectors"
                : "Reach admins for inspection support"}
            </p>
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
            Total Contacts
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{totalContacts}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-[hsl(var(--warning)/0.16)] p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Admin Contacts
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{adminContacts}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            User Contacts
          </p>
          <p className="mt-1 font-display text-3xl font-semibold">{userContacts}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/65 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Latest Activity
          </p>
          <p className="mt-1 font-display text-sm font-semibold">
            {formatTimestamp(latestActivity)}
          </p>
        </div>
      </div>
    </section>
  );
}
