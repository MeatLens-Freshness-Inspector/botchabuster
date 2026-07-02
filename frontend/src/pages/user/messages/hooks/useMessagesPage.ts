import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useIsDesktop } from "@/hooks/use-desktop";
import {
  userChatClient,
  type UserChatContact,
  type UserChatMessage,
} from "@/integrations/api/UserChatClient";
import type { MessagesMobilePanel } from "../types";
import { formatContactName } from "../utils/formatters";
import { resolveSelectedContactId } from "../utils/viewState";

const POLL_INTERVAL_MS = 6_000;

type LoadOptions = {
  silent?: boolean;
};

export function useMessagesPage() {
  const { user, isAdmin } = useAuth();
  const isDesktop = useIsDesktop();
  const [contacts, setContacts] = useState<UserChatContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UserChatMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [mobilePanel, setMobilePanel] = useState<MessagesMobilePanel>("contacts");
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId],
  );

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => {
      const haystack = [
        formatContactName(contact),
        contact.email ?? "",
        contact.inspector_code ?? "",
        contact.location ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [contactSearch, contacts]);

  const contactStats = useMemo(() => {
    const adminContacts = contacts.filter((contact) => contact.role === "admin").length;
    const userContacts = contacts.length - adminContacts;
    const latestActivity =
      contacts
        .map((contact) => contact.last_message_at)
        .filter((value): value is string => typeof value === "string")
        .sort(
          (left, right) =>
            new Date(right).getTime() - new Date(left).getTime(),
        )[0] ?? null;

    return {
      total: contacts.length,
      adminContacts,
      userContacts,
      latestActivity,
    };
  }, [contacts]);

  const showContactsPanel = isDesktop || mobilePanel === "contacts";
  const showThreadPanel = isDesktop || mobilePanel === "thread";

  const loadMessages = useCallback(async (counterpartyId: string, options?: LoadOptions) => {
    if (!options?.silent) {
      setIsLoadingMessages(true);
    }

    try {
      const nextMessages = await userChatClient.getMessages(counterpartyId);
      setMessages(nextMessages);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load chat messages";
      if (!options?.silent) {
        toast.error(message);
      }
    } finally {
      if (!options?.silent) {
        setIsLoadingMessages(false);
      }
    }
  }, []);

  const loadContacts = useCallback(async (options?: LoadOptions) => {
    if (!options?.silent) {
      setIsLoadingContacts(true);
    }

    try {
      const nextContacts = await userChatClient.getContacts();
      setContacts(nextContacts);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load chat contacts";
      if (!options?.silent) {
        toast.error(message);
      }
    } finally {
      if (!options?.silent) {
        setIsLoadingContacts(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    setSelectedContactId((currentId) =>
      resolveSelectedContactId(contacts, currentId, isDesktop),
    );
  }, [contacts, isDesktop]);

  useEffect(() => {
    if (!selectedContactId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedContactId);
  }, [loadMessages, selectedContactId]);

  useEffect(() => {
    if (!selectedContactId) return;

    const intervalId = window.setInterval(() => {
      void loadContacts({ silent: true });
      void loadMessages(selectedContactId, { silent: true });
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadContacts, loadMessages, selectedContactId]);

  useEffect(() => {
    if (isDesktop) return;

    if (!selectedContactId && mobilePanel === "thread") {
      setMobilePanel("contacts");
    }
  }, [isDesktop, mobilePanel, selectedContactId]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  const handleRefreshContacts = useCallback(async () => {
    await loadContacts();
  }, [loadContacts]);

  const handleSendMessage = useCallback(async () => {
    const content = draftMessage.trim();
    if (!selectedContactId || !content || isSendingMessage) return;

    setIsSendingMessage(true);
    setDraftMessage("");

    try {
      await userChatClient.sendMessage(selectedContactId, content);
      await Promise.all([
        loadMessages(selectedContactId, { silent: true }),
        loadContacts({ silent: true }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send chat message";
      toast.error(message);
      setDraftMessage(content);
    } finally {
      setIsSendingMessage(false);
    }
  }, [draftMessage, isSendingMessage, loadContacts, loadMessages, selectedContactId]);

  const handleSelectContact = useCallback(
    (contactId: string) => {
      setSelectedContactId(contactId);
      if (!isDesktop) {
        setMobilePanel("thread");
      }
    },
    [isDesktop],
  );

  return {
    currentUserId: user?.id ?? null,
    isAdmin,
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
  };
}
