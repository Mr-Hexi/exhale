import { useState, useEffect } from "react";
import api from "../api/axios";
import Navbar from "../components/shared/Navbar";
import JournalEntry from "../components/Journal/JournalEntry";

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    setLoading(true);
    try {
      const res = await api.get("/api/journal/");
      setEntries(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load journal entries.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newContent.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post("/api/journal/", { content: newContent.trim() });
      setEntries([res.data, ...entries]);
      setNewContent("");
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save entry.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUpdate(updated) {
    setEntries(entries.map((e) => (e.id === updated.id ? updated : e)));
  }

  function handleDelete(id) {
    setEntries(entries.filter((e) => e.id !== id));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Journal</h1>
            <p className="text-sm text-slate-400 mt-0.5">Write freely. Exhale listens.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm bg-indigo-500 text-white px-4 py-2 rounded-xl hover:bg-indigo-600 transition-colors"
          >
            {showForm ? "Cancel" : "+ New Entry"}
          </button>
        </div>

        {/* New entry form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
            <textarea
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg p-3 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="What's on your mind today?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleCreate}
                disabled={submitting || !newContent.trim()}
                className="text-sm bg-indigo-500 text-white px-4 py-2 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Saving…" : "Save Entry"}
              </button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Entry list */}
        {loading ? (
          <div className="flex justify-center items-center h-40 text-slate-400 text-sm">
            Loading entries…
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-center text-slate-400">
            <span className="text-4xl mb-3">📓</span>
            <p className="text-sm">Your journal is empty.</p>
            <p className="text-sm">Write your first entry.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <JournalEntry
                key={entry.id}
                entry={entry}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}