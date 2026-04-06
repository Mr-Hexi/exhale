import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api/axios";

function buildJournalContextBlock(journalContext) {
  if (!journalContext) return "";

  const parts = [];
  const date = journalContext.createdAt
    ? new Date(journalContext.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  if (date) parts.push(`Date: ${date}`);
  if (journalContext.emotion) parts.push(`Detected emotion: ${journalContext.emotion}`);
  if (journalContext.content) parts.push(`Journal entry: ${journalContext.content.trim()}`);
  if (journalContext.aiInsight) parts.push(`AI insight: ${journalContext.aiInsight.trim()}`);

  if (parts.length === 0) return "";

  return [
    "The user opened this chat from a journal entry and wants to discuss it.",
    "Use the details below as conversation context:",
    ...parts.map((line) => `- ${line}`),
  ].join("\n");
}

function buildJournalConversationPayload(journalContext) {
  const contextBlock = buildJournalContextBlock(journalContext);
  const hasContext = Boolean(contextBlock);
  const initialMessage = journalContext?.content?.trim() || "";

  return {
    title: hasContext ? "Journal Reflection" : "New Chat",
    journal_context: contextBlock,
    initial_message: initialMessage,
  };
}

export function useChat({ initialJournalContext = null } = {}) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isCrisis, setIsCrisis] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const skipNextHistoryLoadForRef = useRef(null);

  const loadHistory = useCallback(async (conversationId) => {
    if (!conversationId) return;
    setMessages([]);
    setIsCrisis(false);
    setError(null);

    try {
      const res = await api.get(`/api/chat/${conversationId}/history/`);
      setMessages(res.data);
    } catch {
      setError("Failed to load chat history.");
    }
  }, []);

  const createConversation = useCallback(async (options = {}) => {
    try {
      const res = await api.post("/api/chat/conversations/", {
        title: options.title || "New Chat",
        journal_context: options.journalContext || "",
      });
      const newConv = res.data;
      setConversations((prev) => [...prev, newConv]);
      setActiveConversationId(newConv.id);
      return newConv;
    } catch {
      setError("Failed to create a new conversation.");
      return null;
    }
  }, []);

  const sendMessageToConversation = useCallback(async (conversationId, text) => {
    if (!conversationId || !text?.trim()) return;
    setIsLoading(true);
    setError(null);

    const tempUserMsg = { id: `temp-u-${Date.now()}`, content: text, role: "user" };
    const tempAiMsg = { id: `temp-a-${Date.now()}`, content: "", role: "assistant" };
    setMessages((prev) => [...prev, tempUserMsg, tempAiMsg]);

    try {
      const accessUrl = api.defaults.baseURL ? api.defaults.baseURL : "";
      const response = await fetch(`${accessUrl}/api/chat/${conversationId}/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access")}`,
        },
        body: JSON.stringify({ content: text }),
      });

      if (!response.ok) {
        throw new Error("API response error");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      const processEvent = async (eventText) => {
        if (!eventText) return;

        const dataLines = eventText
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => line.slice(6));

        if (dataLines.length === 0) return;
        const dataStr = dataLines.join("\n").trim();
        if (!dataStr) return;

        try {
          const data = JSON.parse(dataStr);

          if (data.type === "chunk") {
            const chunk = data.content || "";
            for (let i = 0; i < chunk.length; i += 1) {
              const char = chunk[i];
              let delay = 30;
              if (char === "." || char === "!" || char === "?") delay = 200;
              else if (char === "," || char === ";" || char === ":") delay = 100;
              else if (char === " ") delay = 40;

              // Keep typed feel without flooding UI updates.
              // eslint-disable-next-line no-await-in-loop
              await new Promise((resolve) => setTimeout(resolve, delay));

              setMessages((prev) => {
                if (!prev || prev.length === 0) return prev;
                const next = [...prev];
                const lastIdx = next.length - 1;
                if (!next[lastIdx]) return prev;

                next[lastIdx] = {
                  ...next[lastIdx],
                  content: (next[lastIdx].content || "") + char,
                };
                return next;
              });
            }
          } else if (data.type === "done") {
            const { user_message, ai_message, is_crisis, conversation } = data.result;
            setMessages((prev) => {
              if (!prev) return prev;
              const next = [...prev];
              if (next.length >= 2) {
                next[next.length - 2] = user_message;
                next[next.length - 1] = ai_message;
              } else {
                next.push(user_message, ai_message);
              }
              return next;
            });
            setIsCrisis(is_crisis || false);
            if (conversation?.id) {
              setConversations((prev) =>
                prev.map((item) => (item.id === conversation.id ? { ...item, ...conversation } : item))
              );
            }
          } else if (data.type === "error") {
            setError(data.error);
            setMessages((prev) =>
              prev && prev.length >= 2 ? prev.slice(0, prev.length - 2) : []
            );
          }
        } catch (streamParseError) {
          // eslint-disable-next-line no-console
          console.error("Error parsing stream event", streamParseError, dataStr);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventText of events) {
          // eslint-disable-next-line no-await-in-loop
          await processEvent(eventText);
        }
      }

      const trailing = buffer.trim();
      if (trailing) {
        await processEvent(trailing);
      }
    } catch (sendError) {
      // eslint-disable-next-line no-console
      console.error(sendError);
      setError("Something went wrong. Please try again.");
      setMessages((prev) =>
        prev && prev.length >= 2 ? prev.slice(0, prev.length - 2) : []
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startConversationFromJournal = useCallback(
    async (journalContext) => {
      const payload = buildJournalConversationPayload(journalContext);
      const conversation = await createConversation({
        title: payload.title,
        journalContext: payload.journal_context,
      });
      if (conversation && payload.initial_message) {
        skipNextHistoryLoadForRef.current = conversation.id;
        await sendMessageToConversation(conversation.id, payload.initial_message);
      }
      return conversation;
    },
    [createConversation, sendMessageToConversation]
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const res = await api.get("/api/chat/conversations/");
        if (cancelled) return;

        const convs = res.data;
        setConversations(convs);

        if (initialJournalContext) {
          const payload = buildJournalConversationPayload(initialJournalContext);
          const created = await api.post("/api/chat/conversations/", payload);
          if (cancelled) return;
          setConversations((prev) => [...prev, created.data]);
          if (payload.initial_message) {
            skipNextHistoryLoadForRef.current = created.data.id;
          }
          setActiveConversationId(created.data.id);
          if (payload.initial_message) {
            await sendMessageToConversation(created.data.id, payload.initial_message);
          }
          return;
        }

        if (convs.length > 0) {
          setActiveConversationId(convs[0].id);
          return;
        }

        const created = await api.post("/api/chat/conversations/", { title: "New Chat" });
        if (cancelled) return;
        setConversations([created.data]);
        setActiveConversationId(created.data.id);
      } catch {
        if (!cancelled) setError("Failed to load conversations.");
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [initialJournalContext]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (skipNextHistoryLoadForRef.current === activeConversationId) {
      skipNextHistoryLoadForRef.current = null;
      return;
    }
    loadHistory(activeConversationId);
  }, [activeConversationId, loadHistory]);

  const selectConversation = useCallback(
    (id) => {
      if (id === activeConversationId) return;
      setActiveConversationId(id);
    },
    [activeConversationId]
  );

  const renameConversation = useCallback(
    async (id, title) => {
      const nextTitle = title.trim();
      if (!nextTitle) return false;

      const previous = conversations.find((c) => c.id === id);
      if (!previous) return false;

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === id ? { ...conversation, title: nextTitle } : conversation
        )
      );

      try {
        await api.patch(`/api/chat/conversations/${id}/`, { title: nextTitle });
        return true;
      } catch {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === id ? { ...conversation, title: previous.title } : conversation
          )
        );
        setError("Failed to rename conversation.");
        return false;
      }
    },
    [conversations]
  );

  const deleteConversation = useCallback(
    (id) => {
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);

        if (id === activeConversationId) {
          if (remaining.length > 0) {
            setActiveConversationId(remaining[0].id);
          } else {
            api.post("/api/chat/conversations/", { title: "New Chat" })
              .then((res) => {
                setConversations([res.data]);
                setActiveConversationId(res.data.id);
              })
              .catch(() => {
                setActiveConversationId(null);
                setMessages([]);
              });
          }
        }

        return remaining;
      });
    },
    [activeConversationId]
  );

  const sendMessage = useCallback(
    async (text) => {
      if (!activeConversationId) return;
      await sendMessageToConversation(activeConversationId, text);
    },
    [activeConversationId, sendMessageToConversation]
  );

  const clearChat = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      await api.delete(`/api/chat/${activeConversationId}/clear/`);
      setMessages([]);
      setIsCrisis(false);
    } catch {
      setError("Failed to clear chat.");
    }
  }, [activeConversationId]);

  return {
    conversations,
    activeConversationId,
    selectConversation,
    createConversation,
    startConversationFromJournal,
    renameConversation,
    deleteConversation,
    messages,
    isCrisis,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}
