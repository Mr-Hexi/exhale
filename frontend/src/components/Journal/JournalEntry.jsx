import { useState } from "react";
import api from "../../api/axios";
import AIInsight from "./AIInsight";

const EMOTION_META = {
  happy:   { emoji: "😊", color: "bg-green-100 text-green-700" },
  sad:     { emoji: "😟", color: "bg-blue-100 text-blue-700" },
  anxious: { emoji: "😰", color: "bg-yellow-100 text-yellow-700" },
  angry:   { emoji: "😤", color: "bg-red-100 text-red-700" },
};

export default function JournalEntry({ entry, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightText, setInsightText] = useState(entry.ai_insight || null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const emotion = entry.emotion ? EMOTION_META[entry.emotion] : null;
  const createdAt = new Date(entry.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  async function handleGetInsight() {
    setInsightLoading(true);
    setError(null);
    try {
      const res = await api.post(`/api/journal/${entry.id}/insight/`);
      setInsightText(res.data.insight);
    } catch (err) {
      setError(err.response?.data?.error || "Could not generate insight.");
    } finally {
      setInsightLoading(false);
    }
  }

  async function handleSaveEdit() {
    setError(null);
    try {
      const res = await api.put(`/api/journal/${entry.id}/`, { content: editContent });
      onUpdate(res.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save changes.");
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await api.delete(`/api/journal/${entry.id}/`);
      onDelete(entry.id);
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete entry.");
    }
  }

  const preview = entry.content.length > 120
    ? entry.content.slice(0, 120) + "…"
    : entry.content;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs text-slate-400">{createdAt}</span>
        <div className="flex items-center gap-2">
          {emotion && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emotion.color}`}>
              {emotion.emoji} {entry.emotion}
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-indigo-500 hover:underline"
          >
            {expanded ? "Collapse" : "View"}
          </button>
        </div>
      </div>

      {/* Content */}
      {!expanded ? (
        <p className="text-sm text-slate-600 leading-relaxed">{preview}</p>
      ) : (
        <div>
          {editing ? (
            <div className="space-y-2">
              <textarea
                className="w-full text-sm text-slate-700 border border-slate-300 rounded-lg p-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="text-xs bg-indigo-500 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-600"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditing(false); setEditContent(entry.content); }}
                  className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
          )}

          {/* AI Insight */}
          <AIInsight insightText={insightText} isLoading={insightLoading} />

          {error && (
            <p className="mt-2 text-xs text-red-500">{error}</p>
          )}

          {/* Action buttons */}
          {!editing && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={handleGetInsight}
                disabled={insightLoading}
                className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
              >
                ✨ Get AI Insight
              </button>
              <button
                onClick={() => setEditing(true)}
                className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                ✏️ Edit
              </button>
              {confirmDelete ? (
                <>
                  <button
                    onClick={handleDelete}
                    className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100"
                >
                  🗑 Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}