import { useState, useEffect, useCallback } from "react"
import api from "../api/axios"

export function useChat() {
  const [messages, setMessages] = useState([])
  const [smartAction, setSmartAction] = useState(null)
  const [isCrisis, setIsCrisis] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [conversationId, setConversationId] = useState(null)

  // ✅ defined BEFORE useEffect so it's in scope when called
  const loadHistory = useCallback(async (id) => {
    try {
      const res = await api.get(`/api/chat/${id}/history/`)
      setMessages(res.data)
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load chat history.")
    }
  }, [])

  useEffect(() => {
    const initConversation = async () => {
      try {
        const res = await api.get("/api/chat/conversations/")
        let id

        if (res.data.length > 0) {
          id = res.data[0].id
        } else {
          const created = await api.post("/api/chat/conversations/")
          id = created.data.id
        }

        setConversationId(id)
        await loadHistory(id)
      } catch (err) {
        setError("Failed to load conversation.")
      }
    }

    initConversation()
  }, [loadHistory])  // ✅ loadHistory in dependency array since it's used inside

  const sendMessage = useCallback(async (text) => {
    if (!conversationId || !text.trim()) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await api.post(`/api/chat/${conversationId}/send/`, {
        content: text,
      })

      const { user_message, ai_message, smart_action, is_crisis } = res.data

      setMessages((prev) => [...prev, user_message, ai_message])
      setSmartAction(smart_action || null)
      setIsCrisis(is_crisis || false)
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  const clearChat = useCallback(async () => {
    if (!conversationId) return
    try {
      await api.delete(`/api/chat/${conversationId}/clear/`)
      setMessages([])
      setSmartAction(null)
      setIsCrisis(false)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || "Failed to clear chat.")
    }
  }, [conversationId])

  return {
    messages,
    smartAction,
    isCrisis,
    isLoading,
    error,
    conversationId,
    sendMessage,
    clearChat,
  }
}