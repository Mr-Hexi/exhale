import { useState } from "react";

export default function SmartActionPill({ smartAction }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!smartAction) return null;

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => setIsOpen((previous) => !previous)}
        className="inline-flex items-center gap-2 rounded-full border border-[rgba(31,122,106,0.16)] bg-[rgba(223,241,235,0.84)] px-4 py-2 text-xs font-semibold text-[var(--brand-600)] transition-colors hover:bg-[rgba(223,241,235,1)]"
      >
        <span>{isOpen ? "Hide prompt" : "Helpful prompt"}</span>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
          {smartAction.label}
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 rounded-[1.4rem] border border-[rgba(31,122,106,0.12)] bg-white/88 px-4 py-4 text-sm leading-7 text-slate-700 shadow-sm whitespace-pre-line">
          {smartAction.content}
        </div>
      )}
    </div>
  );
}
