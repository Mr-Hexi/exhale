import { useState } from "react";

export default function InputBar({ onSend, isLoading }) {
  const [text, setText] = useState("");

  function handleSend() {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl items-end gap-3 rounded-[1.6rem] border border-black/5 bg-white/92 p-3 shadow-sm">
        <textarea
          className="ui-input min-h-[52px] flex-1 resize-none border-none bg-transparent px-2 py-2 shadow-none focus:shadow-none"
          rows={1}
          placeholder="Type what is on your mind..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <button
          onClick={handleSend}
          disabled={isLoading || !text.trim()}
          className="ui-btn ui-btn-primary h-12 w-12 shrink-0 rounded-full p-0"
          aria-label="Send message"
        >
          {isLoading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.4 20.4 21 12 3.4 3.6l-.1 6.2 12.6 2.2-12.6 2.2z" />
            </svg>
          )}
        </button>
      </div>
      <p className="mx-auto mt-2 w-full max-w-4xl px-2 text-xs text-slate-400">
        Press Enter to send. Use Shift + Enter for a new line.
      </p>
    </div>
  );
}
