import { useState, useEffect } from "react";
import api from "../api/axios";
import Navbar from "../components/shared/Navbar";
import MoodChart from "../components/Dashboard/MoodChart";
import EmotionSummary from "../components/Dashboard/EmotionSummary";
import SkeletonCard from "../components/Dashboard/SkeletonCard"; // ✅ added

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
        const historyRes = await api.get("/api/mood/history/");
        if (!cancelled) setMoodHistory(historyRes.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || "Could not load mood history.");
      }

      try {
        const statsRes = await api.get("/api/mood/stats/");
        const raw = statsRes.data;
        const statsObj = { happy: 0, sad: 0, anxious: 0, angry: 0 };
        Object.keys(statsObj).forEach((k) => {
          if (raw[k] !== undefined) statsObj[k] = raw[k];
        });
        if (!cancelled) setStats(statsObj);
      } catch (err) {
        console.error("Stats fetch failed:", err.response?.data);
      }

      if (!cancelled) setLoading(false);

      setInsightLoading(true);
      try {
        const insightRes = await api.get("/api/mood/weekly-insight/");
        if (!cancelled) setInsight(insightRes.data.insight);
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

  // ✅ NEW: skeleton loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard height="h-64" />
          <SkeletonCard height="h-64" />
          <SkeletonCard height="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Your emotional patterns at a glance.
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <MoodChart moodHistory={moodHistory} />
          <EmotionSummary stats={stats} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Weekly Insight
          </h2>

          {insightLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 italic">
              <svg
                className="animate-spin h-4 w-4 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Generating your weekly insight…
            </div>
          ) : insight ? (
            <p className="text-sm text-slate-700 leading-relaxed">
              {insight}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              No insight yet — log some moods over the week and check back.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}