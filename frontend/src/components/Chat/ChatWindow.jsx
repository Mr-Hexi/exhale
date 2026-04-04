import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ messages, isCrisis }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Group messages by date
  function getDateLabel(iso) {
    if (!iso) return "Today";
    const date = new Date(iso);
    if (isNaN(date)) return "Today";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msgDate = new Date(date);
    msgDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - msgDate) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  return (
    <div className="wa-messages ui-scrollbar">
      {isCrisis && (
        <div className="wa-crisis-banner">
          <strong>If you are in immediate crisis, please reach out now.</strong>
          <span> iCall (India): 9152987821 · Vandrevala Foundation: 1860-2662-345 · </span>
          <a href="https://findahelpline.com" target="_blank" rel="noreferrer">
            findahelpline.com
          </a>
        </div>
      )}

      {messages.length > 0 && (
        <div className="wa-date-chip">
          <span>{getDateLabel(messages[0].timestamp)}</span>
        </div>
      )}

      {messages.map((message, index) => {
        if (!message.content && message.role === "assistant") return null;
        return (
          <div key={message.id ?? index}>
            <MessageBubble message={message} />
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
