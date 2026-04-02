import { useState } from "react";
import api from "../../api/axios";

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onClose,
}) {
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  async function handleDelete(event, id) {
    event.stopPropagation();

    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }

    setDeletingId(id);
    try {
      await api.delete(`/api/chat/conversations/${id}/`);
      onDelete(id);
    } catch {
      // Parent state already protects the rest of the page.
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  function formatDate(iso) {
    const date = new Date(iso);
    const today = new Date();
    const diffDays = Math.floor((today - date) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-20 bg-slate-900/30 backdrop-blur-sm sm:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-0 z-30 flex h-full w-80 flex-col border-r border-black/5 bg-[rgba(248,245,240,0.98)] shadow-2xl transition-transform duration-300 sm:static sm:h-auto sm:translate-x-0 sm:rounded-[1.8rem] sm:border sm:shadow-[0_20px_60px_rgba(24,39,54,0.08)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-black/5 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="ui-kicker mb-2">Your Space</p>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">Conversations</h2>
              <p className="mt-1 text-sm text-slate-500">Separate threads keep each check-in easy to revisit.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl border border-black/5 bg-white/80 px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 sm:hidden"
            >
              Close
            </button>
          </div>

          <button onClick={() => { onNew(); onClose(); }} className="ui-btn ui-btn-primary mt-5 w-full justify-center">
            New conversation
          </button>
        </div>

        <div className="ui-scrollbar flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {conversations.length === 0 && (
            <div className="ui-card-soft px-4 py-6 text-center text-sm text-slate-500">
              No conversations yet. Start one to begin your first reflection.
            </div>
          )}

          {conversations.map((conversation) => {
            const isActive = conversation.id === activeId;
            const isConfirming = confirmId === conversation.id;
            const isDeleting = deletingId === conversation.id;

            return (
              <div
                key={conversation.id}
                onClick={() => { onSelect(conversation.id); onClose(); }}
                className={`group relative flex w-full cursor-pointer items-start gap-3 rounded-[1.25rem] px-4 py-3 text-left transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-[rgba(31,122,106,0.14)]"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(conversation.id);
                    onClose();
                  }
                }}
              >
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isActive ? "bg-[var(--brand-500)]" : "bg-slate-300"}`} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{conversation.title || "New Chat"}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(conversation.created_at)}</p>
                </div>

                <button
                  onClick={(event) => handleDelete(event, conversation.id)}
                  disabled={isDeleting}
                  className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold transition-all ${
                    isConfirming
                      ? "bg-[rgba(251,227,227,0.9)] text-[#a53636] opacity-100"
                      : "bg-white/80 text-slate-400 opacity-0 group-hover:opacity-100"
                  } ${isDeleting ? "opacity-50" : ""}`}
                  title={isConfirming ? "Click again to confirm" : "Delete"}
                >
                  {isDeleting ? "..." : isConfirming ? "Confirm" : "Delete"}
                </button>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
