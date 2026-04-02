import { useEffect, useState } from "react";
import api from "../api/axios";
import EmotionSummary from "../components/Dashboard/EmotionSummary";
import MoodChart from "../components/Dashboard/MoodChart";
import SkeletonCard from "../components/Dashboard/SkeletonCard";
import Navbar from "../components/shared/Navbar";

export default function DashboardPage() {
  const [moodHistory, setMoodHistory] = useState([]);
  const [stats, setStats] = useState({ happy: 0, sad: 0, anxious: 0, angry: 0 });
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      setLoading(true);
      setError(null);

      try {
        const historyResponse = await api.get("/api/mood/history/");
        if (!cancelled) setMoodHistory(historyResponse.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || "Could not load mood history.");
      }

      try {
        const statsResponse = await api.get("/api/mood/stats/");
        const nextStats = { happy: 0, sad: 0, anxious: 0, angry: 0 };
        Object.keys(nextStats).forEach((key) => {
          if (statsResponse.data[key] !== undefined) nextStats[key] = statsResponse.data[key];
        });
        if (!cancelled) setStats(nextStats);
      } catch {
        // Keep the rest of the page usable if stats fail.
      }

      if (!cancelled) setLoading(false);

      setInsightLoading(true);
      try {
        const insightResponse = await api.get("/api/mood/weekly-insight/");
        if (!cancelled) setInsight(insightResponse.data.insight);
      } catch {
        if (!cancelled) setInsight(null);
      } finally {
        if (!cancelled) setInsightLoading(false);
      }
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalLogs = moodHistory.length;

  if (loading) {
    return (
      <div className="ui-shell min-h-screen">
        <Navbar />
        <div className="ui-page grid gap-4 px-1 py-6 md:grid-cols-2">
          <SkeletonCard height="h-72" />
          <SkeletonCard height="h-72" />
          <SkeletonCard height="h-44 md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="ui-shell min-h-screen">
      <Navbar />

      <main className="ui-page px-1 py-6 md:py-8">
        <section className="mb-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="ui-card">
            <p className="ui-kicker">Dashboard</p>
            <h1 className="ui-title text-[clamp(2rem,4vw,3.3rem)]">See your emotional patterns more clearly.</h1>
            <p className="ui-subtitle mt-4 max-w-2xl">
              This view turns check-ins from chat and journal into a calm summary so trends are easier to notice without feeling clinical.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="ui-card">
              <p className="ui-kicker">Tracked Logs</p>
              <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-900">{totalLogs}</p>
              <p className="mt-2 text-sm text-slate-500">Each log comes from a real interaction, not a separate manual workflow.</p>
            </div>
            <div className="ui-card">
              <p className="ui-kicker">Weekly Focus</p>
              <p className="text-sm leading-7 text-slate-600">
                Use the trend line for momentum and the breakdown for balance. Together they help frame what needs attention.
              </p>
            </div>
          </div>
        </section>

        {error && <div className="ui-alert-error mb-6">{error}</div>}

        <section className="grid gap-4 md:grid-cols-2">
          <MoodChart moodHistory={moodHistory} />
          <EmotionSummary stats={stats} />
        </section>

        <section className="ui-card mt-6">
          <p className="ui-kicker">Weekly Insight</p>
          <h2 className="ui-section-title mt-1">A short summary of your recent emotional pattern</h2>

          {insightLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <svg className="h-4 w-4 animate-spin text-[var(--brand-500)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generating your weekly insight...
            </div>
          ) : insight ? (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">{insight}</p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No insight yet. Keep checking in through chat or journal and this section will update.</p>
          )}
        </section>
      </main>
    </div>
  );
}
