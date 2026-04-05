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
const EMOTION_COLOR = { 1: "#7eb6e8", 2: "#dfb255", 3: "#dc7f7f", 4: "#64b895" };

function CustomDot({ cx, cy, payload }) {
  return <circle cx={cx} cy={cy} r={5} fill={EMOTION_COLOR[payload.value] || "#64b895"} stroke="#fff" strokeWidth={2} />;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const { value, date } = payload[0].payload;
  return (
    <div className="rounded-2xl border border-black/5 bg-white/95 px-3 py-2 text-xs shadow-sm">
      <p className="text-slate-400">{date}</p>
      <p className="mt-1 font-semibold capitalize text-slate-700">{EMOTION_LABEL[value]}</p>
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

  const data = filteredHistory.map((log) => ({
    date: new Date(log.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    value: EMOTION_VALUE[log.emotion] ?? 2,
    emotion: log.emotion,
  }));

  return (
    <div className="ui-card min-h-[320px]">
      <p className="ui-kicker">Mood Over Time</p>
      <h2 className="ui-section-title">Daily emotional trend</h2>
      <div className="mt-6 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1f7a6a" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#1f7a6a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ebe6df" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8a95a0" }} tickLine={false} axisLine={false} />
            <YAxis
              domain={[1, 4]}
              ticks={[1, 2, 3, 4]}
              tickFormatter={(value) => EMOTION_LABEL[value]}
              tick={{ fontSize: 11, fill: "#8a95a0" }}
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
