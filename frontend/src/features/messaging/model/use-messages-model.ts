import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  UserChatContact,
  UserChatMessage,
  UserChatStreamStatus,
} from "@/entities/message";
import type { MessagesMobilePanel } from "./types";
import { formatContactName } from "@/features/messaging/lib/formatters";
import { resolveSelectedContactId } from "./view-state";
import {
  applyMessageToContacts,
  applyMessageJournalToContacts,
  getCounterpartyId,
  isConversationMessage,
  mergeContactSnapshots,
  upsertMessages,
} from "./message-state";
import { useMessageStream, type MessageStreamStatus } from "./use-message-stream";

type LoadOptions = { silent?: boolean };

export interface MessagingClient {
  getContacts(): Promise<UserChatContact[]>;
  getMessages(counterpartyId: string, limit?: number): Promise<UserChatMessage[]>;
  sendMessage(recipientId: string, content: string): Promise<UserChatMessage>;
}

interface OpenStreamOptions {
  signal: AbortSignal;
  onMessage: (message: UserChatMessage) => void;
  onStatus: (status: UserChatStreamStatus) => void;
}

interface UseMessagesModelOptions {
  auth: {
    user: { id: string } | null;
    isAdmin: boolean;
    isOnlineAuthenticated: boolean;
  };
  isDesktop: boolean;
  client: MessagingClient;
  openStream?: (options: OpenStreamOptions) => Promise<void>;
}

export function useMessagesModel(options: UseMessagesModelOptions) {
  const { auth, isDesktop, client } = options;
  const currentUserId = auth.user?.id ?? null;
  const [contacts, setContacts] = useState<UserChatContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UserChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [mobilePanel, setMobilePanel] = useState<MessagesMobilePanel>("contacts");
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const selectedContactIdRef = useRef<string | null>(selectedContactId);
  const contactsPromiseRef = useRef<{ identity: string; promise: Promise<void> } | null>(null);
  const snapshotPromiseRef = useRef<Promise<void> | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const authIdentity = auth.isOnlineAuthenticated ? currentUserId : null;
  const authIdentityRef = useRef(authIdentity);
  const previousAuthIdentityRef = useRef(authIdentity);
  const streamJournalRef = useRef(new Map<string, UserChatMessage>());
  authIdentityRef.current = authIdentity;
  selectedContactIdRef.current = selectedContactId;

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );
  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) => [
      formatContactName(contact),
      contact.email ?? "",
      contact.inspector_code ?? "",
      contact.location ?? "",
    ].join(" ").toLowerCase().includes(query));
  }, [contactSearch, contacts]);
  const contactStats = useMemo(() => {
    const adminContacts = contacts.filter((contact) => contact.role === "admin").length;
    const latestActivity = contacts
      .map((contact) => contact.last_message_at)
      .filter((value): value is string => typeof value === "string")
      .sort((left, right) => right.localeCompare(left))[0] ?? null;
    return {
      total: contacts.length,
      adminContacts,
      userContacts: contacts.length - adminContacts,
      latestActivity,
    };
  }, [contacts]);

  const loadContacts = useCallback((loadOptions?: LoadOptions): Promise<void> => {
    const requestIdentity = authIdentity;
    if (!requestIdentity) {
      setContacts([]);
      setIsLoadingContacts(false);
      return Promise.resolve();
    }
    if (contactsPromiseRef.current?.identity === requestIdentity) return contactsPromiseRef.current.promise;
    if (!loadOptions?.silent) setIsLoadingContacts(true);
    const promise = (async () => {
      try {
        const snapshot = await client.getContacts();
        if (authIdentityRef.current === requestIdentity) {
          setContacts((current) => applyMessageJournalToContacts(
            mergeContactSnapshots(current, snapshot),
            streamJournalRef.current,
            requestIdentity,
          ));
        }
      } catch (error) {
        if (!loadOptions?.silent) {
          toast.error(error instanceof Error ? error.message : "Failed to load chat contacts");
        }
      } finally {
        if (!loadOptions?.silent) setIsLoadingContacts(false);
      }
    })().finally(() => {
      if (contactsPromiseRef.current?.promise === promise) contactsPromiseRef.current = null;
    });
    contactsPromiseRef.current = { identity: requestIdentity, promise };
    return promise;
  }, [auth.isOnlineAuthenticated, client]);

  const loadMessages = useCallback(async (counterpartyId: string, loadOptions?: LoadOptions) => {
    const requestIdentity = authIdentity;
    if (!requestIdentity) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }
    if (!loadOptions?.silent) setIsLoadingMessages(true);
    try {
      const snapshot = await client.getMessages(counterpartyId);
      if (authIdentityRef.current === requestIdentity && selectedContactIdRef.current === counterpartyId) {
        setMessages((current) => upsertMessages(current, snapshot));
      }
    } catch (error) {
      if (!loadOptions?.silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load chat messages");
      }
    } finally {
      if (!loadOptions?.silent) setIsLoadingMessages(false);
    }
  }, [authIdentity, client]);

  const refreshSnapshot = useCallback((loadOptions: LoadOptions = { silent: true }): Promise<void> => {
    if (snapshotPromiseRef.current) return snapshotPromiseRef.current;
    const counterpartyId = selectedContactIdRef.current;
    const promise = Promise.all([
      loadContacts(loadOptions),
      counterpartyId ? loadMessages(counterpartyId, loadOptions) : Promise.resolve(),
    ]).then(() => undefined).finally(() => {
      if (snapshotPromiseRef.current === promise) snapshotPromiseRef.current = null;
    });
    snapshotPromiseRef.current = promise;
    return promise;
  }, [loadContacts, loadMessages]);

  const applyIncomingMessage = useCallback((message: UserChatMessage) => {
    if (!authIdentity || authIdentityRef.current !== authIdentity) return;
    const counterpartyId = getCounterpartyId(message, authIdentity);
    if (counterpartyId) {
      const previous = streamJournalRef.current.get(counterpartyId);
      if (!previous || previous.created_at.localeCompare(message.created_at) <= 0) {
        streamJournalRef.current.set(counterpartyId, message);
      }
    }
    setContacts((current) => applyMessageToContacts(current, message, authIdentity));
    const selectedCounterpartyId = selectedContactIdRef.current;
    if (selectedCounterpartyId && isConversationMessage(message, authIdentity, selectedCounterpartyId)) {
      setMessages((current) => upsertMessages(current, [message]));
    }
  }, [authIdentity]);

  const messageStream = useMessageStream({
    enabled: auth.isOnlineAuthenticated,
    openStream: options.openStream,
    onMessage: applyIncomingMessage,
    onGap: () => refreshSnapshot({ silent: true }),
  });

  useEffect(() => {
    if (previousAuthIdentityRef.current === authIdentity) return;
    previousAuthIdentityRef.current = authIdentity;
    streamJournalRef.current.clear();
    contactsPromiseRef.current = null;
    snapshotPromiseRef.current = null;
    selectedContactIdRef.current = null;
    setContacts([]);
    setMessages([]);
    setSelectedContactId(null);
    setIsLoadingContacts(Boolean(authIdentity));
    setIsLoadingMessages(false);
  }, [authIdentity]);

  useEffect(() => {
    if (!auth.isOnlineAuthenticated) {
      setContacts([]);
      setMessages([]);
      setIsLoadingContacts(false);
      setIsLoadingMessages(false);
      return;
    }
    void loadContacts();
  }, [auth.isOnlineAuthenticated, loadContacts]);

  useEffect(() => {
    const nextId = resolveSelectedContactId(contacts, selectedContactIdRef.current, isDesktop);
    if (nextId === selectedContactIdRef.current) return;
    selectedContactIdRef.current = nextId;
    setMessages([]);
    setSelectedContactId(nextId);
  }, [contacts, isDesktop]);

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
    if (auth.isOnlineAuthenticated && selectedContactId) void loadMessages(selectedContactId);
  }, [auth.isOnlineAuthenticated, loadMessages, selectedContactId]);

  useEffect(() => {
    if (!isDesktop && !selectedContactId && mobilePanel === "thread") setMobilePanel("contacts");
  }, [isDesktop, mobilePanel, selectedContactId]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  const handleRefreshMessages = useCallback(async () => {
    if (!auth.isOnlineAuthenticated) {
      toast.error("Messages require an active online session.");
      return;
    }
    const refresh = refreshSnapshot({ silent: false });
    messageStream.reconnect();
    await refresh;
  }, [auth.isOnlineAuthenticated, messageStream, refreshSnapshot]);

  const handleSendMessage = useCallback(async () => {
    if (!auth.isOnlineAuthenticated) {
      toast.error("Reconnect and sign in online before sending messages.");
      return;
    }
    const content = draftMessage.trim();
    if (!selectedContactId || !content || isSendingMessage) return;
    setIsSendingMessage(true);
    setDraftMessage("");
    try {
      applyIncomingMessage(await client.sendMessage(selectedContactId, content));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send chat message");
      setDraftMessage(content);
    } finally {
      setIsSendingMessage(false);
    }
  }, [
    applyIncomingMessage,
    auth.isOnlineAuthenticated,
    client,
    draftMessage,
    isSendingMessage,
    selectedContactId,
  ]);

  const handleSelectContact = useCallback((contactId: string) => {
    selectedContactIdRef.current = contactId;
    setMessages([]);
    setSelectedContactId(contactId);
    if (!isDesktop) setMobilePanel("thread");
  }, [isDesktop]);

  return {
    currentUserId,
    isAdmin: auth.isAdmin,
    isOnlineAuthenticated: auth.isOnlineAuthenticated,
    isDesktop,
    contacts,
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
    messageStreamStatus: messageStream.status as MessageStreamStatus,
    lastMessageRef,
    contactStats,
    showContactsPanel: isDesktop || mobilePanel === "contacts",
    showThreadPanel: isDesktop || mobilePanel === "thread",
    setDraftMessage,
    setContactSearch,
    setMobilePanel,
    handleRefreshContacts: handleRefreshMessages,
    handleRefreshMessages,
    handleReconnectMessages: messageStream.reconnect,
    handleSelectContact,
    handleSendMessage,
  };
}

export type MessagesWorkflow = ReturnType<typeof useMessagesModel>;
