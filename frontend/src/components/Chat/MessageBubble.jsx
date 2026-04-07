import EmotionBadge from "./EmotionBadge";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const parsedDate = new Date(message.timestamp);
  const time = isNaN(parsedDate)
    ? ""
    : parsedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`wa-msg-row ${isUser ? "sent" : "recv"}`}>
      {!isUser && (
        <div className="wa-msg-av" aria-hidden="true">E</div>
      )}

      <div className={`wa-msg-stack ${isUser ? "sent" : "recv"}`}>
        <div className={`wa-bubble ${isUser ? "sent" : "recv"}`}>
          <div className="wa-bubble-content">{message.content}</div>
          <div className="wa-bubble-foot">
            <span className="wa-btime">{time}</span>
            {isUser && <span className="wa-tick">✓✓</span>}
          </div>
        </div>

        {isUser && message.emotion && (
          <div className="wa-emotion-row">
            {/* <EmotionBadge emotion={message.emotion} confidence={message.emotion_confidence} /> */}
            <EmotionBadge emotion={message.emotion}  />
          </div>
        )}
      </div>

      {isUser && <div className="wa-msg-av-gap" aria-hidden="true" />}
    </div>
  );
}
