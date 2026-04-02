import EmotionBadge from "./EmotionBadge";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const parsedDate = new Date(message.timestamp);
  const time = isNaN(parsedDate) ? "" : parsedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-[76%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div className="flex items-center gap-2 px-1">
          {!isUser && (
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[rgba(31,122,106,0.12)] text-xs font-bold text-[var(--brand-500)]">
              AI
            </span>
          )}
          <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${isUser ? "text-[var(--accent-500)]" : "text-slate-400"}`}>
            {isUser ? "You" : "Exhale"}
          </div>
        </div>

        <div
          className={`rounded-[1.6rem] px-4 py-3 text-sm leading-7 shadow-sm ${
            isUser
              ? "rounded-br-md bg-[linear-gradient(135deg,#1f7a6a,#175e52)] text-white"
              : "rounded-bl-md border border-black/5 bg-white/88 text-slate-700"
          }`}
        >
          {message.content}
        </div>

        <div className={`flex flex-wrap items-center gap-2 px-1 text-xs text-slate-400 ${isUser ? "justify-end" : "justify-start"}`}>
          <span>{time}</span>
          {isUser && message.emotion && (
            <EmotionBadge emotion={message.emotion} confidence={message.emotion_confidence} />
          )}
        </div>
      </div>
    </div>
  );
}
