const EMOTION_META = {
  happy:   { emoji: "😊", color: "bg-green-100 text-green-700 border-green-200" },
  sad:     { emoji: "😟", color: "bg-blue-100 text-blue-700 border-blue-200" },
  anxious: { emoji: "😰", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  angry:   { emoji: "😤", color: "bg-red-100 text-red-700 border-red-200" },
};

export default function EmotionSummary({ stats }) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center h-48 text-center text-slate-400">
        <span className="text-3xl mb-2">📊</span>
        <p className="text-sm">No data yet.</p>
        <p className="text-sm">Start chatting to track your emotions.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
        Emotion Breakdown
      </h2>
      <div className="space-y-3">
        {Object.entries(stats)
          .sort(([, a], [, b]) => b - a)
          .map(([emotion, count]) => {
            const meta = EMOTION_META[emotion];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={emotion}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
                    {meta.emoji} {emotion}
                  </span>
                  <span className="text-xs text-slate-400">{count} × ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-indigo-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}