import { useAuth } from "@/contexts/AuthContext";
import { MessagesHeader } from "./user/messages/components/MessagesHeader";
import { ContactsPanel } from "./user/messages/components/ContactsPanel";
import { ThreadPanel } from "./user/messages/components/ThreadPanel";
import { useMessagesPage } from "./user/messages/hooks/useMessagesPage";

export default function MessagesPage() {
  const { isOnlineAuthenticated } = useAuth();
  const {
    currentUserId,
    isAdmin,
    isOnlineAuthenticated: messagesOnline,
    isDesktop,
    filteredContacts,
    selectedContactId,
    selectedContact,
    messages,
    draftMessage,
    contactSearch,
    mobilePanel,
    isLoadingContacts,
    isLoadingMessages,
    isSendingMessage,
    lastMessageRef,
    contactStats,
    showContactsPanel,
    showThreadPanel,
    setDraftMessage,
    setContactSearch,
    setMobilePanel,
    handleRefreshContacts,
    handleSelectContact,
    handleSendMessage,
  } = useMessagesPage();

  if (!isOnlineAuthenticated || !messagesOnline) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
        <div className="mx-auto w-full max-w-4xl px-4 pt-4">
          <div className="rounded-[28px] border border-border/70 bg-card/95 p-6 shadow-[0_26px_80px_-36px_rgba(0,0,0,0.7)] sm:p-8">
            <p className="font-display text-xs uppercase tracking-[0.32em] text-primary/70">
              Online Only
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
              Messages pause when the app is offline.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Your cached inspections and profile basics still work offline, but direct messaging
              requires a live backend session and reconnect will resume it automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const showMessagesHeader = isDesktop || mobilePanel === "contacts";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-4">
        {showMessagesHeader ? (
          <MessagesHeader
            isAdmin={isAdmin}
            totalContacts={contactStats.total}
            adminContacts={contactStats.adminContacts}
            userContacts={contactStats.userContacts}
            latestActivity={contactStats.latestActivity}
          />
        ) : null}

        <div
          className={`grid min-w-0 gap-4 lg:grid-cols-[minmax(290px,0.95fr)_minmax(0,1.05fr)] ${
            showMessagesHeader ? "mt-4" : ""
          }`}
        >
          {showContactsPanel && (
            <ContactsPanel
              contacts={filteredContacts}
              selectedContactId={selectedContactId}
              contactSearch={contactSearch}
              isAdmin={isAdmin}
              isLoadingContacts={isLoadingContacts}
              onSearchChange={setContactSearch}
              onRefresh={handleRefreshContacts}
              onSelectContact={handleSelectContact}
            />
          )}

          {showThreadPanel && (
            <ThreadPanel
              currentUserId={currentUserId}
              selectedContact={selectedContact}
              messages={messages}
              isDesktop={isDesktop}
              isLoadingMessages={isLoadingMessages}
              isSendingMessage={isSendingMessage}
              draftMessage={draftMessage}
              lastMessageRef={lastMessageRef}
              onBack={() => setMobilePanel("contacts")}
              onDraftChange={setDraftMessage}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
