import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import JournalEntry from "../components/Journal/JournalEntry";
import Navbar from "../components/shared/Navbar";

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

export default function JournalPage() {
  const navigate = useNavigate();
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
      const response = await api.get("/api/journal/");
      setEntries(response.data);
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
      const response = await api.post("/api/journal/", { content: newContent.trim() });
      setEntries([response.data, ...entries]);
      setNewContent("");
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save entry.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUpdate(updatedEntry) {
    setEntries(entries.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)));
  }

  function handleDelete(id) {
    setEntries(entries.filter((entry) => entry.id !== id));
  }

  function handleDiscuss(entry) {
    navigate("/chat", {
      state: {
        journalContext: {
          entryId: entry.id,
          content: entry.content,
          emotion: entry.emotion,
          aiInsight: entry.ai_insight,
          createdAt: entry.created_at,
        },
      },
    });
  }

  return (
    <div className="ui-shell min-h-screen">
      <Navbar />

      <motion.main 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="ui-page px-1 py-6 md:py-8"
      >
        <motion.section variants={fadeUp} className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="ui-card">
            <p className="ui-kicker">Reflective Writing</p>
            <h1 className="ui-title text-[clamp(2rem,4vw,3.4rem)]">Journal with a little more clarity.</h1>
            <p className="ui-subtitle mt-4 max-w-2xl">
              Capture thoughts freely, return to older entries, and ask the app for a gentle AI insight when you want a nudge toward reflection.
            </p>
          </div>

          <div className="ui-card">
            <p className="ui-kicker">Journal Flow</p>
            <div className="space-y-4">
              <div className="ui-stat">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Entries</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{entries.length}</p>
              </div>
              <div className="ui-stat">
                <p className="text-sm font-semibold text-slate-800">Private by design</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">The layout stays simple so writing, editing, and reviewing each entry feels lightweight.</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section variants={fadeUp} className="ui-card mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="ui-section-title">Today&apos;s entry</h2>
              <p className="ui-subtitle mt-2">Write as little or as much as you need.</p>
            </div>
            <button onClick={() => setShowForm((value) => !value)} className="ui-btn ui-btn-primary">
              {showForm ? "Close editor" : "New entry"}
            </button>
          </div>

          {showForm && (
            <div className="mt-5 rounded-[1.5rem] border border-black/5 bg-white/82 p-4">
              <textarea
                className="ui-input ui-textarea border-none bg-transparent px-1 py-1 shadow-none focus:shadow-none"
                placeholder="What is on your mind today?"
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                autoFocus
              />
              <div className="mt-4 flex justify-end">
                <button onClick={handleCreate} disabled={submitting || !newContent.trim()} className="ui-btn ui-btn-primary">
                  {submitting ? "Saving..." : "Save entry"}
                </button>
              </div>
            </div>
          )}
        </motion.section>

        {error && <motion.div variants={fadeUp} className="ui-alert-error mb-6">{error}</motion.div>}

        {loading ? (
          <div className="ui-card flex justify-center py-16">
            <div className="h-10 w-10 rounded-full border-4 border-[rgba(31,122,106,0.18)] border-t-[var(--brand-500)] animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="ui-card flex flex-col items-center justify-center py-20 text-center">
            <p className="ui-kicker">No Entries Yet</p>
            <h2 className="ui-section-title">Your journal is waiting.</h2>
            <p className="ui-subtitle mt-3 max-w-md">Start with one honest sentence. You can always edit, expand, or ask for insight later.</p>
          </div>
        ) : (
            <motion.div variants={fadeUp} className="space-y-4">
            {entries.map((entry) => (
              <JournalEntry
                key={entry.id}
                entry={entry}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onDiscuss={handleDiscuss}
              />
            ))}
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}
