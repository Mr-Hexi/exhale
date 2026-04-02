import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import SmartActionPill from "./SmartActionPill";

export default function ChatWindow({ messages, smartAction, isCrisis }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastAssistantIndex = messages.reduce(
    (last, message, index) => (message.role === "assistant" ? index : last),
    -1
  );

  return (
    <div className="ui-scrollbar flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {isCrisis && (
          <div className="rounded-[1.4rem] border border-[#d9b2b2] bg-[rgba(251,227,227,0.72)] px-4 py-4 text-sm text-[#8f3131]">
            <p className="font-semibold">If you are in immediate crisis, please reach out now.</p>
            <p className="mt-2">iCall (India): 9152987821</p>
            <p>Vandrevala Foundation: 1860-2662-345</p>
            <p>International support: findahelpline.com</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id ?? index}>
            <MessageBubble message={message} />
            {index === lastAssistantIndex && smartAction && (
              <div className="mt-2 sm:mt-3">
                <SmartActionPill smartAction={smartAction} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
