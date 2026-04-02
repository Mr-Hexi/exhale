export default function AIInsight({ insightText, isLoading }) {
  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-400 italic">
        <svg className="animate-spin h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Generating insight…
      </div>
    );
  }

  if (!insightText) return null;

  return (
    <div className="mt-3 border-l-4 border-indigo-400 bg-indigo-50 rounded-r-lg px-4 py-3">
      <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">AI Insight</p>
      <p className="text-sm text-slate-700 leading-relaxed">{insightText}</p>
    </div>
  );
}