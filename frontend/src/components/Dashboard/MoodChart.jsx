import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const EMOTION_VALUE = { sad: 1, anxious: 2, angry: 3, happy: 4 };
const EMOTION_LABEL = { 1: "sad", 2: "anxious", 3: "angry", 4: "happy" };
const EMOTION_COLOR = { sad: "#7eb6e8", anxious: "#dfb255", angry: "#dc7f7f", happy: "#64b895" };

function normalizeDay(ts) {
  const day = new Date(ts);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

function buildDailyDominantData(logs) {
  const grouped = logs.reduce((acc, log) => {
    const key = normalizeDay(log.logged_at);
    const current = acc[key] || { counts: {}, total: 0, latestTs: 0, latestEmotion: log.emotion };
    const ts = new Date(log.logged_at).getTime();

    current.counts[log.emotion] = (current.counts[log.emotion] || 0) + 1;
    current.total += 1;

    if (ts >= current.latestTs) {
      current.latestTs = ts;
      current.latestEmotion = log.emotion;
    }

    acc[key] = current;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([dayTs, dayStats]) => {
      const sorted = Object.entries(dayStats.counts).sort((a, b) => b[1] - a[1]);
      const topCount = sorted[0]?.[1] || 0;
      const tied = sorted.filter(([, count]) => count === topCount).map(([emotion]) => emotion);
      const emotion = tied.includes(dayStats.latestEmotion) ? dayStats.latestEmotion : sorted[0]?.[0] || "anxious";

      return {
        dayTs: Number(dayTs),
        dayLabel: new Date(Number(dayTs)).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        value: EMOTION_VALUE[emotion] ?? 2,
        emotion,
        logs: dayStats.total,
      };
    });
}

function CustomDot({ cx, cy, payload }) {
  return <circle cx={cx} cy={cy} r={5} fill={EMOTION_COLOR[payload.emotion] || "#64b895"} stroke="#fff" strokeWidth={2} />;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const { emotion, dayLabel, logs } = payload[0].payload;

  return (
    <div className="rounded-3xl border border-black/5 bg-white/95 px-4 py-3 text-xs shadow-sm">
      <p className="text-[13px] text-slate-400">{dayLabel}</p>
      <p className="mt-1 text-[30px] leading-none font-semibold capitalize text-slate-700">{emotion}</p>
      <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">{logs} check-ins</p>
    </div>
  );
}

export default function MoodChart({ moodHistory }) {
  const filteredHistory = (moodHistory || []).filter((log) => log.emotion !== "neutral");

  if (filteredHistory.length === 0) {
    return (
      <div className="ui-card flex min-h-[320px] flex-col items-center justify-center text-center">
        <p className="ui-kicker">Mood Over Time</p>
        <h2 className="ui-section-title">No mood data yet</h2>
        <p className="ui-subtitle mt-3 max-w-sm">No non-neutral mood points yet. Keep checking in and your trend line will appear here.</p>
      </div>
    );
  }

  const emotionCounts = filteredHistory.reduce((acc, log) => {
    acc[log.emotion] = (acc[log.emotion] || 0) + 1;
    return acc;
  }, {});

  const dominantEmotion = Object.entries(emotionCounts).sort(([, a], [, b]) => b - a)[0]?.[0];

  const data = buildDailyDominantData(filteredHistory);
  const totalDays = data.length;
  const recentEmotion = data.slice(-3).map((point) => point.emotion);
  const isStableRecent = recentEmotion.length >= 2 && new Set(recentEmotion).size === 1;

  return (
    <div className="ui-card min-h-[320px]">
      <p className="ui-kicker">Mood Over Time</p>
      <h2 className="ui-section-title">Daily emotional trend</h2>
      <p className="ui-subtitle mt-2 text-sm">
        {dominantEmotion ? `Most frequent mood: ${dominantEmotion}. ` : ""}
        {isStableRecent ? `Recent days are consistently ${recentEmotion[0]}.` : `Based on dominant mood across ${totalDays} days.`}
      </p>
      <div className="mt-6 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1f7a6a" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1f7a6a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ebe6df" />
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 11, fill: "#8a95a0" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[1, 4]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(value) => EMOTION_LABEL[value]}
              tick={{ fontSize: 11, fill: "#8a95a0" }}
              width={58}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#1f7a6a"
              strokeWidth={2.5}
              fill="url(#moodGrad)"
              dot={<CustomDot />}
              activeDot={{ r: 6, fill: "#175e52" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
