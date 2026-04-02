import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const EMOTION_VALUE = { sad: 1, anxious: 2, angry: 3, happy: 4 };
const EMOTION_LABEL = { 1: "😟 sad", 2: "😰 anxious", 3: "😤 angry", 4: "😊 happy" };
const EMOTION_COLOR = { 1: "#93c5fd", 2: "#fde68a", 3: "#fca5a5", 4: "#86efac" };

function CustomDot(props) {
  const { cx, cy, payload } = props;
  const color = EMOTION_COLOR[payload.value] || "#a5b4fc";
  return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { value, date, emotion } = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-md">
      <p className="text-slate-500 mb-0.5">{date}</p>
      <p className="font-medium text-slate-700">{EMOTION_LABEL[value] || emotion}</p>
    </div>
  );
}

export default function MoodChart({ moodHistory }) {
  if (!moodHistory || moodHistory.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center h-48 text-center text-slate-400">
        <span className="text-3xl mb-2">📈</span>
        <p className="text-sm">No mood data yet.</p>
        <p className="text-sm">Start chatting to see your mood trend.</p>
      </div>
    );
  }

  const data = moodHistory.map((log) => ({
    date: new Date(log.logged_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    value: EMOTION_VALUE[log.emotion] ?? 2,
    emotion: log.emotion,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
        Mood Over Time
      </h2>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a5b4fc" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a5b4fc" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[1, 4]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(v) => EMOTION_LABEL[v]?.split(" ")[0] ?? ""}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#818cf8"
            strokeWidth={2}
            fill="url(#moodGrad)"
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: "#6366f1" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}