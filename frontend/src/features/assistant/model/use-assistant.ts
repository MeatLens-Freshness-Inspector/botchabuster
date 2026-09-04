import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/shared/api/base-url";
import { fetchWithTimeout } from "@/shared/api/fetch-with-timeout";
import { getApiCsrfToken } from "@/shared/api/request";

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantWorkflow = {
  input: string;
  loading: boolean;
  messages: AssistantMessage[];
  open: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  send: () => Promise<void>;
  setInput: (value: string) => void;
  setOpen: (value: boolean) => void;
};

const CHAT_URL = `${API_BASE_URL}/chat`;
const INITIAL_MESSAGE: AssistantMessage = {
  role: "assistant",
  content: "Hi! I'm MeatLens AI. Ask me about meat freshness, food safety, or how to use the app.",
};

export function getChatRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const csrfToken = getApiCsrfToken();
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
}

export function useAssistant(): AssistantWorkflow {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: AssistantMessage = { role: "user", content: text };
    setInput("");
    setMessages((previous) => [...previous, userMessage]);
    setLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMessage];

    try {
      const response = await fetchWithTimeout(
        CHAT_URL,
        {
          method: "POST",
          headers: getChatRequestHeaders(),
          body: JSON.stringify({
            messages: allMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Request failed" }));
        setMessages((previous) => [
          ...previous,
          { role: "assistant", content: `⚠️ ${error.error || "Something went wrong."}` },
        ]);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let lineEnd: number;
        while ((lineEnd = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, lineEnd);
          buffer = buffer.slice(lineEnd + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;

          const json = line.slice(6).trim();
          if (json === "[DONE]") break;

          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((previous) => {
                const last = previous[previous.length - 1];
                if (last?.role === "assistant" && previous.length > allMessages.length) {
                  return previous.map((message, index) =>
                    index === previous.length - 1
                      ? { ...message, content: assistantSoFar }
                      : message,
                  );
                }
                return [...previous, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buffer = `${line}\n${buffer}`;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: "⚠️ Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return {
    input,
    loading,
    messages,
    open,
    scrollRef,
    send,
    setInput,
    setOpen,
  };
}
