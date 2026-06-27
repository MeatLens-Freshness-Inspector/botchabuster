import { MessagesHeader } from "./user/messages/components/MessagesHeader";
import { ContactsPanel } from "./user/messages/components/ContactsPanel";
import { ThreadPanel } from "./user/messages/components/ThreadPanel";
import { useMessagesPage } from "./user/messages/hooks/useMessagesPage";

export default function MessagesPage() {
  const {
    currentUserId,
    isAdmin,
    isDesktop,
    filteredContacts,
    selectedContactId,
    selectedContact,
    messages,
    draftMessage,
    contactSearch,
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))] pb-24">
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 pt-4">
        <MessagesHeader
          isAdmin={isAdmin}
          totalContacts={contactStats.total}
          adminContacts={contactStats.adminContacts}
          userContacts={contactStats.userContacts}
          latestActivity={contactStats.latestActivity}
        />

        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(290px,0.95fr)_minmax(0,1.05fr)]">
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
