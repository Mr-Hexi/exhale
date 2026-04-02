import { useEffect, useRef } from "react"
import MessageBubble from "./MessageBubble"
import SmartActionPill from "./SmartActionPill"

export default function ChatWindow({ messages, smartAction, isCrisis }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const lastAiIndex = messages.reduce(
    (last, msg, i) => (msg.role === "assistant" ? i : last),
    -1
  )

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-6 text-center">
        <span className="text-4xl mb-3">🌬️</span>
        <p className="text-lg font-medium text-gray-500">Start a conversation.</p>
        <p className="text-sm mt-1">Exhale is here to listen.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      {isCrisis && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-4">
          <p className="text-red-700 font-semibold text-sm mb-1">
            🚨 If you're in crisis, please reach out:
          </p>
          <p className="text-red-600 text-sm">iCall (India): 9152987821</p>
          <p className="text-red-600 text-sm">Vandrevala Foundation: 1860-2662-345 (24/7)</p>
          <p className="text-red-600 text-sm">International: findahelpline.com</p>
        </div>
      )}

      {messages.map((message, index) => (
        <div key={message.id ?? index}>
          <MessageBubble
            message={message}
            isUser={message.role === "user"}
          />
          {index === lastAiIndex && smartAction && (
            <div className="ml-2 mt-1">
              <SmartActionPill smartAction={smartAction} />
            </div>
          )}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  )
}