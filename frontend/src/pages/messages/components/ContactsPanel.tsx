import { Loader2, MessageSquare, RefreshCw, Search, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserChatContact } from "@/integrations/api/UserChatClient";
import { formatContactName, formatTimestamp } from "../utils/formatters";

type ContactsPanelProps = {
  contacts: UserChatContact[];
  selectedContactId: string | null;
  contactSearch: string;
  isAdmin: boolean;
  isLoadingContacts: boolean;
  onSearchChange: (value: string) => void;
  onRefresh: () => void | Promise<void>;
  onSelectContact: (contactId: string) => void;
};

export function ContactsPanel({
  contacts,
  selectedContactId,
  contactSearch,
  isAdmin,
  isLoadingContacts,
  onSearchChange,
  onRefresh,
  onSelectContact,
}: ContactsPanelProps) {
  return (
    <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4 lg:flex lg:max-h-[calc(100dvh-24rem)] lg:min-h-[560px] lg:flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">Contact Directory</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            {contacts.length} shown
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-xl"
            onClick={() => void onRefresh()}
            disabled={isLoadingContacts}
            aria-label="Refresh contacts"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingContacts ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-border/70 bg-background/50 p-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={contactSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, email, code..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="mt-3 space-y-2 overflow-y-auto pr-1 lg:min-h-0 lg:flex-1">
        {isLoadingContacts ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-background/55 py-16 text-muted-foreground">
            <MessageSquare className="mb-3 h-10 w-10" />
            <p className="font-display text-sm uppercase tracking-wider">No contacts found</p>
            <p className="mt-1 text-xs">
              {isAdmin
                ? "No user accounts are available for chat."
                : "No admins are currently available for chat."}
            </p>
          </div>
        ) : (
          contacts.map((contact) => {
            const isSelected = selectedContactId === contact.id;

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelectContact(contact.id)}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                  isSelected
                    ? "border-primary/40 bg-[hsl(var(--primary)/0.16)]"
                    : "border-border/70 bg-background/55 hover:bg-background/75"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold tracking-tight">
                      {formatContactName(contact)}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {contact.role === "admin" ? "Admin" : "User"}
                    </p>
                  </div>
                  {contact.role === "admin" ? (
                    <Shield className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                  {contact.last_message_preview ?? "Start a conversation"}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {formatTimestamp(contact.last_message_at)}
                </p>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
