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
  const contactsPromiseRef = useRef<Promise<void> | null>(null);
  const snapshotPromiseRef = useRef<Promise<void> | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
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
    if (!auth.isOnlineAuthenticated) {
      setContacts([]);
      setIsLoadingContacts(false);
      return Promise.resolve();
    }
    if (contactsPromiseRef.current) return contactsPromiseRef.current;
    if (!loadOptions?.silent) setIsLoadingContacts(true);
    const promise = (async () => {
      try {
        const snapshot = await client.getContacts();
        setContacts((current) => mergeContactSnapshots(current, snapshot));
      } catch (error) {
        if (!loadOptions?.silent) {
          toast.error(error instanceof Error ? error.message : "Failed to load chat contacts");
        }
      } finally {
        if (!loadOptions?.silent) setIsLoadingContacts(false);
      }
    })().finally(() => {
      if (contactsPromiseRef.current === promise) contactsPromiseRef.current = null;
    });
    contactsPromiseRef.current = promise;
    return promise;
  }, [auth.isOnlineAuthenticated, client]);

  const loadMessages = useCallback(async (counterpartyId: string, loadOptions?: LoadOptions) => {
    if (!auth.isOnlineAuthenticated) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }
    if (!loadOptions?.silent) setIsLoadingMessages(true);
    try {
      const snapshot = await client.getMessages(counterpartyId);
      if (selectedContactIdRef.current === counterpartyId) {
        setMessages((current) => upsertMessages(current, snapshot));
      }
    } catch (error) {
      if (!loadOptions?.silent) {
        toast.error(error instanceof Error ? error.message : "Failed to load chat messages");
      }
    } finally {
      if (!loadOptions?.silent) setIsLoadingMessages(false);
    }
  }, [auth.isOnlineAuthenticated, client]);

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
    if (!currentUserId) return;
    setContacts((current) => applyMessageToContacts(current, message, currentUserId));
    const counterpartyId = selectedContactIdRef.current;
    if (counterpartyId && isConversationMessage(message, currentUserId, counterpartyId)) {
      setMessages((current) => upsertMessages(current, [message]));
    }
  }, [currentUserId]);

  const messageStream = useMessageStream({
    enabled: auth.isOnlineAuthenticated,
    openStream: options.openStream,
    onMessage: applyIncomingMessage,
    onGap: () => refreshSnapshot({ silent: true }),
  });

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
    setSelectedContactId((currentId) =>
      resolveSelectedContactId(contacts, currentId, isDesktop),
    );
  }, [contacts, isDesktop]);

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
    setMessages([]);
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
