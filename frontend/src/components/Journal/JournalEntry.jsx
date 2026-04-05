import { useState } from "react";
import api from "../../api/axios";
import AIInsight from "./AIInsight";

const EMOTION_META = {
  happy: { emoji: "😊", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sad: { emoji: "😟", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  anxious: { emoji: "😰", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  angry: { emoji: "😤", tone: "bg-rose-50 text-rose-700 border-rose-200" },
  neutral: { emoji: "😌", tone: "bg-slate-100 text-slate-700 border-slate-300" },
};

export default function JournalEntry({ entry, onUpdate, onDelete, onDiscuss }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightText, setInsightText] = useState(entry.ai_insight || null);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const emotion = entry.emotion ? EMOTION_META[entry.emotion] : null;
  const createdAt = new Date(entry.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const preview = entry.content.length > 180 ? `${entry.content.slice(0, 180)}...` : entry.content;

  async function handleGetInsight() {
    setInsightLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/journal/${entry.id}/insight/`);
      setInsightText(response.data.insight);
      setExpanded(true);
    } catch (err) {
      setError(err.response?.data?.error || "Could not generate insight.");
    } finally {
      setInsightLoading(false);
    }
  }

  async function handleSaveEdit() {
    setError(null);
    try {
      const response = await api.put(`/api/journal/${entry.id}/`, { content: editContent });
      onUpdate(response.data);
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

  return (
    <article className="ui-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="ui-kicker mb-2">Journal Entry</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{createdAt}</span>
            {emotion && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${emotion.tone}`}>
                {emotion.emoji} {entry.emotion}
              </span>
            )}
          </div>
        </div>

        <button onClick={() => setExpanded((value) => !value)} className="ui-btn ui-btn-ghost self-start">
          {expanded ? "Collapse" : "Read more"}
        </button>
      </div>

      {!expanded ? (
        <p className="mt-4 text-sm leading-7 text-slate-600">{preview}</p>
      ) : (
        <div className="mt-4">
          {editing ? (
            <div className="space-y-3">
              <textarea
                className="ui-input ui-textarea"
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button onClick={handleSaveEdit} className="ui-btn ui-btn-primary">Save changes</button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditContent(entry.content);
                  }}
                  className="ui-btn ui-btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{entry.content}</p>
          )}

          <AIInsight insightText={insightText} isLoading={insightLoading} />

          {error && <p className="mt-3 text-sm text-[#a53636]">{error}</p>}

          {!editing && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => onDiscuss?.(entry)} className="ui-btn ui-btn-primary">
                Discuss in chat
              </button>
              <button onClick={handleGetInsight} disabled={insightLoading} className="ui-btn ui-btn-secondary">
                Get AI insight
              </button>
              <button onClick={() => setEditing(true)} className="ui-btn ui-btn-ghost">
                Edit
              </button>
              {confirmDelete ? (
                <>
                  <button onClick={handleDelete} className="ui-btn ui-btn-danger">
                    Confirm delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="ui-btn ui-btn-ghost">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="ui-btn ui-btn-danger">
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
