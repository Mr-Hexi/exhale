import { useState } from "react";
import api from "../api/axios";
import { useChat } from "../hooks/useChat";
import ChatWindow from "../components/Chat/ChatWindow";
import { ConversationSidebar } from "../components/Chat/ConversationSidebar";
import InputBar from "../components/Chat/InputBar";
import TypingIndicator from "../components/Chat/TypingIndicator";
import Navbar from "../components/shared/Navbar";

const CHECKIN_OPTIONS = [
  { emotion: "happy", emoji: "😊", label: "Happy" },
  { emotion: "sad", emoji: "😟", label: "Sad" },
  { emotion: "anxious", emoji: "😰", label: "Anxious" },
  { emotion: "angry", emoji: "😤", label: "Angry" },
];

export default function ChatPage() {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    createConversation,
    deleteConversation,
    messages,
    smartAction,
    isCrisis,
    isLoading,
    error,
    sendMessage,
    clearChat,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMood, setActiveMood] = useState(null);
  const [checkinDone, setCheckinDone] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  async function handleCheckin(emotion) {
    setActiveMood(emotion);
    setTimeout(() => setCheckinDone(true), 1200);
    try {
      await api.post("/api/mood/checkin/", { emotion });
    } catch {
      // Ignore check-in failures so chat remains uninterrupted.
    }
  }

  return (
    <div className="ui-shell flex h-[100dvh] flex-col overflow-hidden">
      <Navbar />

      <div className="ui-page flex flex-1 gap-4 overflow-hidden px-1 py-4 md:py-6">
        <ConversationSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={selectConversation}
          onNew={createConversation}
          onDelete={deleteConversation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <section className="ui-panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3 sm:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-2xl border border-black/5 bg-white/85 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              aria-label="Open conversations"
            >
              Menu
            </button>
            <span className="truncate text-sm font-medium text-slate-700">
              {activeConversation?.title || "Conversation"}
            </span>
          </div>

          {!checkinDone && (
            <div className="border-b border-black/5 bg-[rgba(223,241,235,0.55)] px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Quick mood check-in</p>
                  <p className="text-sm text-slate-500">Capture how you feel before you begin.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CHECKIN_OPTIONS.map(({ emotion, emoji, label }) => (
                    <button
                      key={emotion}
                      onClick={() => handleCheckin(emotion)}
                      className={`ui-btn px-3 py-2 text-xs transition-all ${
                        activeMood === emotion
                          ? "bg-[var(--brand-500)] text-white shadow-md ring-2 ring-[var(--brand-500)] ring-offset-2 ring-offset-[#ebf5f0]"
                          : "ui-btn-secondary"
                      }`}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isCrisis && (
            <div className="border-b border-[#d79f9f] bg-[rgba(251,227,227,0.78)] px-4 py-3 text-sm text-[#8f3131]">
              <strong>Crisis support:</strong> iCall (India): 9152987821 · Vandrevala Foundation: 1860-2662-345 (24/7) ·{" "}
              <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="font-semibold underline">
                findahelpline.com
              </a>
            </div>
          )}

          {error && (
            <div className="px-4 pt-4">
              <div className="ui-alert-error">{error}</div>
            </div>
          )}

          <div className="hidden items-center justify-between gap-4 border-b border-black/5 px-6 py-5 sm:flex">
            <div className="min-w-0">
              <p className="ui-kicker mb-2">Conversation</p>
              <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                {activeConversation?.title || "New conversation"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {messages.length > 0
                  ? `${messages.length} messages in this thread`
                  : "Start writing when you're ready. Exhale will listen."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="ui-stat hidden min-w-[140px] md:block">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {isLoading ? "Responding..." : "Ready to chat"}
                </p>
              </div>
              <button
                onClick={clearChat}
                disabled={messages.length === 0 || isLoading}
                className="ui-btn ui-btn-ghost"
              >
                Clear thread
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {messages.length === 0 && !isLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="max-w-xl">
                  <p className="ui-kicker">Ready When You Are</p>
                  <h2 className="ui-title text-[clamp(1.9rem,4vw,3.2rem)]">
                    A private space for honest conversation.
                  </h2>
                  <p className="ui-subtitle mt-4">
                    Share what feels heavy, hopeful, uncertain, or tangled. The interface stays calm so your attention can stay on the conversation.
                  </p>
                </div>
              </div>
            ) : (
              <ChatWindow messages={messages} smartAction={smartAction} isCrisis={isCrisis} />
            )}

            {isLoading && (
              <div className="px-4 pb-2 sm:px-6">
                <TypingIndicator />
              </div>
            )}
          </div>

          <div className="sticky bottom-0 border-t border-black/5 bg-[rgba(255,255,255,0.84)] backdrop-blur-xl">
            <InputBar onSend={sendMessage} isLoading={isLoading} />
          </div>
        </section>
      </div>
    </div>
  );
}
