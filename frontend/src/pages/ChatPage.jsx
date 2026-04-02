
import { useChat } from "../hooks/useChat"
import { useState } from "react"
import Navbar from "../components/shared/Navbar"
import ChatWindow from "../components/Chat/ChatWindow"
import InputBar from "../components/Chat/InputBar"

import api from "../api/axios"

const MOOD_OPTIONS = [
  { emotion: "happy",   emoji: "😊", label: "Happy"   },
  { emotion: "sad",     emoji: "😟", label: "Sad"     },
  { emotion: "anxious", emoji: "😰", label: "Anxious" },
  { emotion: "angry",   emoji: "😤", label: "Angry"   },
]

export default function ChatPage() {
  const { messages, smartAction, isCrisis, isLoading, error, sendMessage, clearChat } = useChat()
  const [checkinDone, setCheckinDone] = useState(false)
  const [checkinError, setCheckinError] = useState(null)

  async function handleCheckin(emotion) {
    try {
      await api.post("/api/mood/checkin/", { emotion })
    } catch {
      setCheckinError("Check-in failed. You can try again later.")
    } finally {
      setCheckinDone(true)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />

      <div className="flex flex-col flex-1 max-w-2xl w-full mx-auto overflow-hidden">

        {!checkinDone && (
          <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
            <span className="text-sm text-gray-500 mr-1">How are you feeling?</span>
            {MOOD_OPTIONS.map(({ emotion, emoji, label }) => (
              <button
                key={emotion}
                onClick={() => handleCheckin(emotion)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        )}

        {checkinError && (
          <p className="text-xs text-red-500 px-4 pt-1">{checkinError}</p>
        )}

        {error && (
          <div className="mx-4 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <ChatWindow
          messages={messages}
          smartAction={smartAction}
          isCrisis={isCrisis}
        />

        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <InputBar onSend={sendMessage} isLoading={isLoading} />
        </div>

      </div>
    </div>
  )
}