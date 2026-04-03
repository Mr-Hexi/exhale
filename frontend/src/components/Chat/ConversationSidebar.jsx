import { useState } from "react";
import api from "../../api/axios";

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  isOpen,
  onClose,
}) {
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingRenameId, setSavingRenameId] = useState(null);

  function handleStartRename(event, conversation) {
    event.stopPropagation();
    setEditingId(conversation.id);
    setEditingValue((conversation.title || "New Chat").trim());
  }

  async function handleCommitRename(conversationId) {
    if (savingRenameId) return;
    const trimmedTitle = editingValue.trim();
    if (!trimmedTitle) {
      setEditingValue("New Chat");
      return;
    }

    const currentTitle = (conversations.find((c) => c.id === conversationId)?.title || "").trim();
    if (trimmedTitle === currentTitle) {
      setEditingId(null);
      return;
    }

    setSavingRenameId(conversationId);
    const renamed = await onRename(conversationId, trimmedTitle);
    if (renamed) {
      setEditingId(null);
    }
    setSavingRenameId(null);
  }

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

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const filtered = conversations.filter((c) =>
    (c.title || "New Chat").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/30 backdrop-blur-sm sm:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`wa-sidebar fixed left-0 top-0 z-30 h-full w-80 sm:static sm:h-auto sm:translate-x-0 sm:w-[300px] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top bar */}
        <div className="wa-sidebar-top">
          <div className="wa-profile-av">E</div>
          <div className="flex-1 min-w-0">
            <div className="wa-sidebar-brand">Exhale</div>
            <div className="wa-sidebar-tagline">Calm AI support workspace</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onNew(); onClose(); }}
              title="New conversation"
              className="wa-icon-btn wa-mobile-only"
              aria-label="New conversation"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="wa-icon-btn wa-mobile-only"
              aria-label="Close sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="wa-search-bar">
          <div className="wa-search-inner">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="5.5" cy="5.5" r="4" stroke="#888780" strokeWidth="1.2" />
              <path d="M9 9l2.5 2.5" stroke="#888780" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <input
              className="wa-search-input"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="wa-convo-list ui-scrollbar">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[#888780]">
              {searchQuery ? "No conversations found." : "No conversations yet. Start one!"}
            </div>
          )}

          {filtered.map((conversation) => {
            const isActive = conversation.id === activeId;
            const isConfirming = confirmId === conversation.id;
            const isDeleting = deletingId === conversation.id;
            const initial = (conversation.title || "N")[0].toUpperCase();

            return (
              <div
                key={conversation.id}
                onClick={() => { onSelect(conversation.id); onClose(); }}
                className={`wa-convo-item group ${isActive ? "active" : ""}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(conversation.id);
                    onClose();
                  }
                }}
              >
                <div className="wa-conv-av">{initial}</div>

                <div className="wa-conv-body">
                  {editingId === conversation.id ? (
                    <input
                      autoFocus
                      value={editingValue}
                      maxLength={255}
                      className="wa-conv-name-input"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleCommitRename(conversation.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCommitRename(conversation.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingId(null);
                        }
                      }}
                      aria-label="Conversation name"
                    />
                  ) : (
                    <button
                      type="button"
                      className="wa-conv-name-btn"
                      onClick={(e) => handleStartRename(e, conversation)}
                      title="Rename conversation"
                    >
                      <span className="wa-conv-name">{conversation.title || "New Chat"}</span>
                    </button>
                  )}
                  <div className="wa-conv-preview">
                    {isConfirming ? "Click delete again to confirm" : "Tap to open conversation"}
                  </div>
                </div>

                <div className="wa-conv-meta">
                  <div className="wa-conv-time">{formatDate(conversation.created_at)}</div>
                  <button
                    onClick={(e) => handleDelete(e, conversation.id)}
                    disabled={isDeleting}
                    className={
                      isConfirming
                        ? "wa-delete-btn confirming"
                        : "wa-delete-btn opacity-0 group-hover:opacity-100"
                    }
                    title={isConfirming ? "Click again to confirm delete" : "Delete"}
                  >
                    {isDeleting ? "…" : isConfirming ? "✓" : "✕"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
