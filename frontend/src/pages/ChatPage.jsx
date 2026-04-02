import { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import ChatWindow from "../components/Chat/ChatWindow";
import InputBar from "../components/Chat/InputBar";
import SmartActionPill from "../components/Chat/SmartActionPill";
import TypingIndicator from "../components/Chat/TypingIndicator";
import Navbar from "../components/shared/Navbar";
import api from "../api/axios";

export default function ChatPage() {
  const { messages, smartAction, cbtPrompt, isCrisis, isLoading, error, sendMessage } = useChat();
  const [checkinDismissed, setCheckinDismissed] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleCheckin(emotion) {
    setCheckinLoading(true);
    try {
      await api.post("/api/mood/checkin/", { emotion });
    } catch {
      // silent — checkin is non-critical
    } finally {
      setCheckinLoading(false);
      setCheckinDismissed(true);
    }
  }

  const CHECKIN_OPTIONS = [
    { emotion: "happy", emoji: "😊", label: "Happy" },
    { emotion: "sad", emoji: "😟", label: "Sad" },
    { emotion: "anxious", emoji: "😰", label: "Anxious" },
    { emotion: "angry", emoji: "😤", label: "Angry" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />

      {/* Crisis banner */}
      {isCrisis && (
        <div className="bg-red-600 text-white text-sm text-center px-4 py-3 font-medium">
          🆘 If you're in crisis, please reach out: iCall (India): 9152987821 |
          Vandrevala Foundation: 1860-2662-345 (24/7) | International: findahelpline.com
        </div>
      )}

      {/* Mood check-in bar */}
      {!checkinDismissed && (
        <div className="flex items-center justify-center gap-3 py-3 bg-white border-b border-gray-100 flex-wrap px-4">
          <span className="text-sm text-gray-500 font-medium">How are you feeling?</span>
          {CHECKIN_OPTIONS.map(({ emotion, emoji, label }) => (
            <button
              key={emotion}
              onClick={() => handleCheckin(emotion)}
              disabled={checkinLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-sm text-gray-600 transition-colors disabled:opacity-50"
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm text-center px-4 py-2">
          {error}
        </div>
      )}

      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto pb-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16">
            <div className="text-6xl mb-4">🌬️</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Start a conversation</h2>
            <p className="text-gray-400 text-sm max-w-xs">
              Exhale is here to listen. Share what's on your mind — no judgment, just support.
            </p>
          </div>
        ) : (
          <>
            <ChatWindow messages={messages} />
            {isLoading && <TypingIndicator />}
            <SmartActionPill smartAction={smartAction} />
            {cbtPrompt && (
              <div className="flex justify-start mt-1 px-4">
                <div className="max-w-xs lg:max-w-md bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
                  <p className="text-xs font-medium text-indigo-500 mb-1 uppercase tracking-wide">
                    Reflection
                  </p>
                  <p className="text-sm text-indigo-700 italic">{cbtPrompt.content}</p>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pinned input bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
        <InputBar onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}