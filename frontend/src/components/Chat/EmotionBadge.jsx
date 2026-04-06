const EMOTION_CONFIG = {
  happy: { emoji: "😊", label: "Happy", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sad: { emoji: "😟", label: "Sad", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  anxious: { emoji: "😰", label: "Anxious", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  angry: { emoji: "😤", label: "Angry", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  neutral: { emoji: "😌", label: "Neutral", tone: "bg-slate-100 text-slate-700 border-slate-300" },
};

export default function EmotionBadge({ emotion, confidence }) {
  const config = EMOTION_CONFIG[emotion];
  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium ${config.tone}`}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
      {/* <span>{Math.round(confidence * 100)}%</span> */}
    </span>
  );
}
