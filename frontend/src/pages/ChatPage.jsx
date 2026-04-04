import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useChat } from "../hooks/useChat";
import ChatWindow from "../components/Chat/ChatWindow";
import { ConversationSidebar } from "../components/Chat/ConversationSidebar";
import InputBar from "../components/Chat/InputBar";
import TypingIndicator from "../components/Chat/TypingIndicator";
import Navbar from "../components/shared/Navbar";

export default function ChatPage() {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    createConversation,
    renameConversation,
    deleteConversation,
    messages,
    isCrisis,
    isLoading,
    error,
    sendMessage,
    clearChat,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    setTitleDraft(activeConversation?.title || "New Chat");
  }, [activeConversation?.id, activeConversation?.title]);

  async function commitActiveTitleRename() {
    if (!activeConversationId) return;
    const renamed = await renameConversation(activeConversationId, titleDraft);
    if (renamed) setIsRenamingTitle(false);
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="wa-page-shell"
    >
      {/* ── TOP NAVBAR ── */}
      <Navbar />

      {/* â”€â”€ TWO-COLUMN CHAT SHELL (fills remaining height) â”€â”€ */}
      <div className="wa-shell">
        {/* LEFT SIDEBAR */}
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={selectConversation}
          onNew={createConversation}
          onRename={renameConversation}
          onDelete={deleteConversation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* RIGHT CHAT AREA */}
        <motion.div 
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="wa-chat-area"
        >
          {/* Chat header */}
          <div className="wa-chat-header">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="wa-icon-btn wa-mobile-only"
              aria-label="Open conversations"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            <div className="wa-chat-av">E</div>

            <div className="flex-1 min-w-0">
              {isRenamingTitle ? (
                <input
                  autoFocus
                  value={titleDraft}
                  maxLength={255}
                  className="wa-chat-name-input"
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitActiveTitleRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitActiveTitleRename();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setIsRenamingTitle(false);
                      setTitleDraft(activeConversation?.title || "New Chat");
                    }
                  }}
                  aria-label="Active conversation name"
                />
              ) : (
                <button
                  type="button"
                  className="wa-chat-name-btn"
                  onClick={() => setIsRenamingTitle(true)}
                  title="Rename conversation"
                >
                  <span className="wa-chat-name truncate">{activeConversation?.title || "New Chat"}</span>
                </button>
              )}
              <div className="wa-chat-status">
                {isLoading ? "typingâ€¦" : "online"}
              </div>
            </div>

            <div className="wa-chat-actions">
              <button
                onClick={clearChat}
                disabled={messages.length === 0 || isLoading}
                className="wa-clear-chat-btn"
                title="Clear chat"
                aria-label="Clear chat"
              >
                Clear chat
              </button>
            </div>
          </div>
          {/* Crisis warning */}
          {isCrisis && (
            <div className="wa-crisis-top-bar">
              <strong>Crisis support:</strong> iCall (India): 9152987821 Â· Vandrevala Foundation:
              1860-2662-345 Â·{" "}
              <a href="https://findahelpline.com" target="_blank" rel="noreferrer">
                findahelpline.com
              </a>
            </div>
          )}

          {/* Error */}
          {error && <div className="wa-error-bar">{error}</div>}

          {/* Messages area */}
          {messages.length === 0 && !isLoading ? (
            <div className="wa-empty-state">
              <div className="wa-empty-av">E</div>
              <h2 className="wa-empty-title">A private space for honest conversation.</h2>
              <p className="wa-empty-sub">
                Share what feels heavy, hopeful, uncertain, or tangled. Exhale listens without judgment.
              </p>
            </div>
          ) : (
            <ChatWindow messages={messages} isCrisis={false} />
          )}

          {/* Typing indicator */}
          {isLoading && (!messages.length || messages[messages.length - 1].role === 'user' || (messages[messages.length - 1].role === 'assistant' && !messages[messages.length - 1].content)) && (
            <div className="wa-messages" style={{ flex: "none", paddingTop: 0, paddingBottom: "4px" }}>
              <TypingIndicator />
            </div>
          )}

          {/* Input bar */}
          <InputBar onSend={sendMessage} isLoading={isLoading} />
        </motion.div>
      </div>
    </motion.div>
  );
}

