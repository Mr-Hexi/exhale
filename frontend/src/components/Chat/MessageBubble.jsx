// src/components/Chat/MessageBubble.jsx
import EmotionBadge from "./EmotionBadge"

export default function MessageBubble({ message }) {
  const isUser = message.role === "user"

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
          isUser
            ? "bg-blue-500 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-800 rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>

      <span className="text-xs text-gray-400 mt-1 px-1">{time}</span>

      {isUser && message.emotion && (
        <div className="mt-1 px-1">
          <EmotionBadge
            emotion={message.emotion}
            confidence={message.emotion_confidence}
          />
        </div>
      )}
    </div>
  )
}