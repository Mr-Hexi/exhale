import EmotionBadge from "./EmotionBadge";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const parsedDate = new Date(message.timestamp);
  const time = isNaN(parsedDate)
    ? ""
    : parsedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`wa-msg-row ${isUser ? "sent" : "recv"}`}>
      {/* Avatar for AI messages */}
      {!isUser && (
        <div className="wa-msg-av" aria-hidden="true">E</div>
      )}

      <div className={`wa-bubble ${isUser ? "sent" : "recv"}`}>
        <div className="wa-bubble-content">{message.content}</div>
        <div className="wa-bubble-foot">
          {isUser && message.emotion && (
            <EmotionBadge emotion={message.emotion} confidence={message.emotion_confidence} />
          )}
          <span className="wa-btime">{time}</span>
          {isUser && <span className="wa-tick">✓✓</span>}
        </div>
      </div>

      {/* Spacer so sent messages align right */}
      {isUser && <div className="wa-msg-av-gap" aria-hidden="true" />}
    </div>
  );
}
