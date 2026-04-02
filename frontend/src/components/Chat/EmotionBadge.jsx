// src/components/Chat/EmotionBadge.jsx
const EMOTION_CONFIG = {
  happy:   { emoji: "😊", label: "Happy",   bg: "bg-green-100",  text: "text-green-700"  },
  sad:     { emoji: "😟", label: "Sad",     bg: "bg-blue-100",   text: "text-blue-700"   },
  anxious: { emoji: "😰", label: "Anxious", bg: "bg-yellow-100", text: "text-yellow-700" },
  angry:   { emoji: "😤", label: "Angry",   bg: "bg-red-100",    text: "text-red-700"    },
}

export default function EmotionBadge({ emotion, confidence }) {
  const config = EMOTION_CONFIG[emotion]
  if (!config) return null

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.emoji} {config.label} {Math.round(confidence * 100)}%
    </span>
  )
}