import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

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
  const { user } = useAuth();
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingRenameId, setSavingRenameId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!sidebarRef.current?.contains(event.target)) {
        setMenuOpenId(null);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpenId(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleStartRename(event, conversation) {
    event.stopPropagation();
    setEditingId(conversation.id);
    setEditingValue((conversation.title || "New Chat").trim());
    setMenuOpenId(null);
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

  function handleMenuToggle(event, id) {
    event.stopPropagation();
    setMenuOpenId((current) => (current === id ? null : id));
  }

  async function handleDelete(event, id) {
    event.stopPropagation();

    if (confirmId !== id) {
      setConfirmId(id);
      setMenuOpenId(id);
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
      setMenuOpenId(null);
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
        ref={sidebarRef}
        className={`wa-sidebar fixed left-0 top-0 z-30 h-full w-80 sm:static sm:h-auto sm:translate-x-0 sm:w-[300px] transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top bar */}
        <div className="wa-sidebar-top">
          <div className="wa-profile-av">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'E'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="wa-sidebar-brand truncate">{user?.username || 'Exhale Workspace'}</div>
            <div className="wa-sidebar-tagline truncate">{user?.email || 'Calm AI support workspace'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNew();
                onClose();
              }}
              title="New conversation"
              className="wa-icon-btn"
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
                onClick={() => {
                  onSelect(conversation.id);
                  onClose();
                }}
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
                        e.stopPropagation();
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
                    <span className="wa-conv-name">{conversation.title || "New Chat"}</span>
                  )}
                  <div className="wa-conv-preview">
                    {isConfirming ? "Choose delete once more in the menu to confirm" : "Tap to open conversation"}
                  </div>
                </div>

                <div className="wa-conv-meta">
                  <div className="wa-conv-time">{formatDate(conversation.created_at)}</div>
                  <div>
                    <button
                      type="button"
                      onClick={(e) => handleMenuToggle(e, conversation.id)}
                      // className={`wa-menu-btn ${menuOpenId === conversation.id ? "open" : ""}`}
                      title="Conversation options"
                      aria-label="Conversation options"
                      aria-expanded={menuOpenId === conversation.id}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>

                    <AnimatePresence>
                    {menuOpenId === conversation.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="wa-conv-menu" 
                        role="menu" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="wa-conv-menu-item"
                          onClick={(e) => handleStartRename(e, conversation)}
                          disabled={isDeleting}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block text-slate-500"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          Rename
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={`wa-conv-menu-item danger ${isConfirming ? "confirming" : ""}`}
                          onClick={(e) => handleDelete(e, conversation.id)}
                          disabled={isDeleting}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          {isDeleting ? "Deleting..." : isConfirming ? "Confirm delete" : "Delete"}
                        </button>
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
