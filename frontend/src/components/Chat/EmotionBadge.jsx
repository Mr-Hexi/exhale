const EMOTION_CONFIG = {
  happy: { emoji: "😊", label: "HAPPY" },
  sad: { emoji: "😟", label: "SAD" },
  anxious: { emoji: "😰", label: "ANXIOUS" },
  angry: { emoji: "😤", label: "ANGRY" },
  neutral: { emoji: "😌", label: "NEUTRAL" },
};

export default function EmotionBadge({ emotion, confidence }) {
  const config = EMOTION_CONFIG[emotion];
  if (!config) return null;

  const pct = Number.isFinite(confidence)
    ? Math.round(confidence * 100)
    : null;

  return (
    <span className="wa-emotion-badge">
      <span className="wa-emotion-emoji" aria-hidden="true">{config.emoji}</span>
      <span>{config.label}</span>
      {pct !== null && <span>- {pct}%</span>}
    </span>
  );
}
