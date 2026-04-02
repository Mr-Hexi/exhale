export default function AIInsight({ insightText, isLoading }) {
  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-[1.2rem] border border-[rgba(31,122,106,0.1)] bg-[rgba(223,241,235,0.45)] px-4 py-3 text-sm text-slate-500">
        <svg className="h-4 w-4 animate-spin text-[var(--brand-500)]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Generating insight...
      </div>
    );
  }

  if (!insightText) return null;

  return (
    <div className="mt-4 rounded-[1.4rem] border border-[rgba(31,122,106,0.12)] bg-[rgba(223,241,235,0.42)] px-4 py-4">
      <p className="ui-kicker mb-2">AI Insight</p>
      <p className="text-sm leading-7 text-slate-700">{insightText}</p>
    </div>
  );
}
