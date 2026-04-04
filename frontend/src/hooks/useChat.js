// src/hooks/useChat.js

import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";

export function useChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [isCrisis, setIsCrisis] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Load all conversations on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const res = await api.get("/api/chat/conversations/");
        if (cancelled) return;

        const convs = res.data;
        setConversations(convs);

        if (convs.length > 0) {
          // Auto-select the most recent conversation
          setActiveConversationId(convs[convs.length - 1].id);
        } else {
          // No conversations at all — create one immediately
          const created = await api.post("/api/chat/conversations/", {
            title: "New Chat",
          });
          if (cancelled) return;
          setConversations([created.data]);
          setActiveConversationId(created.data.id);
        }
      } catch {
        if (!cancelled) setError("Failed to load conversations.");
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Load history whenever active conversation changes ─────────────────────
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

  useEffect(() => {
    if (activeConversationId) loadHistory(activeConversationId);
  }, [activeConversationId, loadHistory]);

  // ── Switch to a different conversation ────────────────────────────────────
  const selectConversation = useCallback((id) => {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
  }, [activeConversationId]);

  // ── Create a new conversation ─────────────────────────────────────────────
  const createConversation = useCallback(async () => {
    try {
      const res = await api.post("/api/chat/conversations/", {
        title: "New Chat",
      });
      const newConv = res.data;
      setConversations((prev) => [...prev, newConv]);
      setActiveConversationId(newConv.id);
    } catch {
      setError("Failed to create a new conversation.");
    }
  }, []);

  // Rename a conversation title
  const renameConversation = useCallback(async (id, title) => {
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
  }, [conversations]);

  // ── Delete a conversation ─────────────────────────────────────────────────
  const deleteConversation = useCallback((id) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);

      // If we deleted the active one, switch to the last remaining
      if (id === activeConversationId) {
        if (remaining.length > 0) {
          setActiveConversationId(remaining[remaining.length - 1].id);
        } else {
          // Auto-create a fresh conversation so the UI is never empty
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
  }, [activeConversationId]);

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!activeConversationId) return;
    setIsLoading(true);
    setError(null);

    const tempUserMsg = { id: `temp-u-${Date.now()}`, content: text, role: 'user' };
    const tempAiMsg = { id: `temp-a-${Date.now()}`, content: '', role: 'assistant' };
    setMessages((prev) => [...prev, tempUserMsg, tempAiMsg]);

    try {
      const accessUrl = api.defaults.baseURL ? api.defaults.baseURL : '';
      const response = await fetch(`${accessUrl}/api/chat/${activeConversationId}/send/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access')}`
        },
        body: JSON.stringify({ content: text })
      });

      if (!response.ok) {
        throw new Error("API response error");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (let line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (!dataStr) continue;
            
            try {
              const data = JSON.parse(dataStr);

              if (data.type === 'chunk') {
                // Add natural typing delay based on content
                const chunk = data.content || "";
                for (let i = 0; i < chunk.length; i++) {
                  const char = chunk[i];
                  // Variable delay for more natural typing feel
                  let delay = 30; // base delay

                  // Longer pauses after punctuation
                  if (char === '.' || char === '!' || char === '?') delay = 200;
                  else if (char === ',' || char === ';' || char === ':') delay = 100;
                  else if (char === ' ') delay = 40; // slightly longer for spaces

                  await new Promise(resolve => setTimeout(resolve, delay));

                  // Update message incrementally
                  setMessages(prev => {
                    if (!prev || prev.length === 0) return prev;
                    const newArr = [...prev];
                    const lastIdx = newArr.length - 1;
                    if (!newArr[lastIdx]) return prev;

                    newArr[lastIdx] = {
                      ...newArr[lastIdx],
                      content: (newArr[lastIdx].content || "") + char
                    };
                    return newArr;
                  });
                }
              } else if (data.type === 'done') {
                const { user_message, ai_message, is_crisis } = data.result;
                setMessages(prev => {
                  if (!prev) return prev;
                  const newArr = [...prev];
                  if (newArr.length >= 2) {
                    newArr[newArr.length - 2] = user_message;
                    newArr[newArr.length - 1] = ai_message;
                  } else {
                    // Fallback if the array was somehow cleared during completion
                    newArr.push(user_message, ai_message);
                  }
                  
                  return newArr;
                });
                setIsCrisis(is_crisis || false);
              } else if (data.type === 'error') {
                setError(data.error);
                setMessages(prev => prev && prev.length >= 2 ? prev.slice(0, prev.length - 2) : []); // revert optimistic update
              }
            } catch (e) {
              console.error("Error parsing stream chunk", e, dataStr);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setMessages(prev => prev && prev.length >= 2 ? prev.slice(0, prev.length - 2) : []); // revert optimistic update
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId]);

  // ── Clear current conversation's messages ─────────────────────────────────
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
    // conversation list
    conversations,
    activeConversationId,
    selectConversation,
    createConversation,
    renameConversation,
    deleteConversation,

    // current chat
    messages,
    isCrisis,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}
