import type { RefObject } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  UserChatContact,
  UserChatMessage,
} from "@/integrations/api/UserChatClient";
import { formatContactName, formatTimestamp } from "../utils/formatters";

type ThreadPanelProps = {
  currentUserId: string | null;
  selectedContact: UserChatContact | null;
  messages: UserChatMessage[];
  isDesktop: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  draftMessage: string;
  lastMessageRef: RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSendMessage: () => void | Promise<void>;
};

export function ThreadPanel({
  currentUserId,
  selectedContact,
  messages,
  isDesktop,
  isLoadingMessages,
  isSendingMessage,
  draftMessage,
  lastMessageRef,
  onBack,
  onDraftChange,
  onSendMessage,
}: ThreadPanelProps) {
  return (
    <section className="min-w-0 rounded-3xl border border-border/70 bg-card/92 p-4 lg:flex lg:max-h-[calc(100dvh-24rem)] lg:min-h-[560px] lg:flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isDesktop && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={onBack}
              aria-label="Back to contacts"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="font-display text-base font-semibold">Conversation Thread</h2>
        </div>
        <span className="rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          {messages.length} messages
        </span>
      </div>

      <Card className="mt-3 flex min-h-[52vh] flex-col overflow-hidden rounded-2xl border-border/70 bg-background/55 lg:min-h-0 lg:flex-1">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="border-b border-border/70 bg-background/60 px-4 py-3">
            {selectedContact ? (
              <>
                <p className="font-display text-base font-semibold tracking-tight">
                  {formatContactName(selectedContact)}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {selectedContact.role === "admin" ? "Admin Contact" : "Inspector Contact"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a contact to start chatting.
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {!selectedContact ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                <div className="space-y-1">
                  <p className="font-display uppercase tracking-wider">No conversation selected</p>
                  <p className="text-xs">Pick a contact to view and send messages.</p>
                </div>
              </div>
            ) : isLoadingMessages ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                <div className="space-y-1">
                  <p className="font-display uppercase tracking-wider">No messages yet</p>
                  <p className="text-xs">Send the first message to start this thread.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const mine = message.sender_id === currentUserId;

                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[82%] rounded-2xl border px-3 py-2 ${
                          mine
                            ? "border-primary/40 bg-[hsl(var(--primary)/0.18)] text-foreground"
                            : "border-border/70 bg-background/75 text-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </p>
                        <p className="mt-1 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {formatTimestamp(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={lastMessageRef} />
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border/70 bg-background/65 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void onSendMessage();
            }}
          >
            <Input
              value={draftMessage}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder={
                selectedContact
                  ? `Message ${formatContactName(selectedContact)}...`
                  : "Select a contact to message"
              }
              disabled={!selectedContact || isSendingMessage}
              maxLength={2000}
              className="h-11 rounded-xl bg-background/85"
            />
            <Button
              type="submit"
              disabled={!selectedContact || isSendingMessage || !draftMessage.trim()}
              className="h-11 gap-2 rounded-xl px-4"
            >
              {isSendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
