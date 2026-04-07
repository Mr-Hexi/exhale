const EMOTION_META = {
  happy: { emoji: "😊", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "#64b895" },
  sad: { emoji: "😟", tone: "bg-sky-50 text-sky-700 border-sky-200", bar: "#7eb6e8" },
  anxious: { emoji: "😰", tone: "bg-amber-50 text-amber-700 border-amber-200", bar: "#dfb255" },
  angry: { emoji: "😤", tone: "bg-rose-50 text-rose-700 border-rose-200", bar: "#dc7f7f" },
  neutral: { emoji: "😌", tone: "bg-slate-100 text-slate-700 border-slate-300", bar: "#94a3b8" },
};

export default function EmotionSummary({ stats }) {
  const displayStats = Object.entries(stats).filter(([emotion]) => emotion !== "neutral");
  const total = displayStats.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) {
    return (
      <div className="ui-card flex min-h-[320px] flex-col items-center justify-center text-center">
        <p className="ui-kicker">Emotion Breakdown</p>
        <h2 className="ui-section-title">No emotion data yet</h2>
        <p className="ui-subtitle mt-3 max-w-sm">Your emotion summary will appear here once the app has a few check-ins to work with.</p>
      </div>
    );
  }

  return (
    <div className="ui-card min-h-[320px]">
      <p className="ui-kicker">Emotion Breakdown</p>
      <h2 className="ui-section-title">How your total mood history is distributed</h2>

      <div className="mt-6 space-y-4">
        {displayStats
          .sort(([, a], [, b]) => b - a)
          .map(([emotion, count]) => {
            const meta = EMOTION_META[emotion] || EMOTION_META.neutral;
            const percent = Math.round((count / total) * 100);

            return (
              <div key={emotion}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                    {meta.emoji} {emotion}
                  </span>
                  <span className="text-xs text-slate-500">{count} logs · {percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-[rgba(23,33,43,0.06)]">
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: meta.bar }} />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
