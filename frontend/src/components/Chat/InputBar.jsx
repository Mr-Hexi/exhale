import { useState, useRef } from "react";

export default function InputBar({ onSend, isLoading }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  function handleSend() {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function handleInput(e) {
    setText(e.target.value);
    // Auto-grow
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  return (
    <div className="wa-input-bar">
      {/* Attachment / emoji placeholder */}
      {/* <button className="wa-icon-btn" aria-label="Add attachment" title="Add attachment">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2v16M2 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button> */}

      <div className="wa-input-wrap">
        <textarea
          ref={textareaRef}
          className="wa-input-textarea"
          rows={1}
          placeholder="Type what is on your mind…"
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={isLoading || !text.trim()}
        className="wa-send-btn"
        aria-label="Send message"
      >
        {isLoading ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
            <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10M7 2l5 5-5 5" stroke="#E1F5EE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
