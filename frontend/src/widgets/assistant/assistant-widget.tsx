import { Bot, Loader2, MessageCircle, Send, User, X } from "lucide-react";
import { Button, Input } from "@/shared/ui";
import { useAssistant } from "@/features/assistant";

export type AssistantWidgetProps = {
  isOnlineAuthenticated: boolean;
};

export function AssistantWidget({ isOnlineAuthenticated }: AssistantWidgetProps) {
  const {
    input,
    loading,
    messages,
    open,
    scrollRef,
    send,
    setInput,
    setOpen,
  } = useAssistant();

  if (!isOnlineAuthenticated) {
    return null;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="ai-chat-toggle"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] right-3 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-20 sm:right-4"
        aria-label="Open AI chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      data-testid="ai-chat-window"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] left-3 right-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-[380px] flex-col rounded-xl border border-border bg-card shadow-2xl sm:bottom-20 sm:left-auto sm:right-4 sm:w-[380px]"
      style={{ height: "min(500px, calc(100dvh - 7.5rem - env(safe-area-inset-bottom, 0px)))" }}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-semibold uppercase tracking-wider">MeatLens AI</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((message, index) => (
          <div key={index} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              } break-words`}
            >
              {message.content}
            </div>
            {message.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-lg bg-secondary px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about meat safety..."
            className="flex-1 text-sm"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
