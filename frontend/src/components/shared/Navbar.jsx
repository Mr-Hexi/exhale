import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const navLinkClass = ({ isActive }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition-all ${
      isActive
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
    }`;

  return (
    <nav className="sticky top-0 z-30 border-b border-black/5 bg-[rgba(244,239,232,0.76)] backdrop-blur-xl">
      <div className="ui-page flex items-center justify-between gap-4 px-1 py-4">
        <Link to="/chat" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Logo />
          <div className="hidden sm:block min-w-0 border-l border-[var(--border-subtle)] pl-3 ml-1">
            <p className="text-[10px] font-bold tracking-widest text-[var(--test-soft)] uppercase text-slate-500">Support Workspace</p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-black/5 bg-white/55 p-1 shadow-sm sm:flex">
          <NavLink to="/chat" className={navLinkClass}>Chat</NavLink>
          <NavLink to="/journal" className={navLinkClass}>Journal</NavLink>
          <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          {user && (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-white/50 px-2 py-1 rounded-full border border-black/5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-500)] text-white font-bold text-xs">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="truncate max-w-[120px] pr-2">{user.username}</span>
            </div>
          )}
          <button onClick={handleLogout} className="ui-btn ui-btn-danger !px-4 !py-1.5">
            Logout
          </button>
        </div>

        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="rounded-2xl border border-black/5 bg-white/75 p-2 text-slate-600 transition-colors hover:text-slate-900 sm:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-black/5 bg-white/90 shadow-sm sm:hidden">
          <div className="ui-page flex flex-col gap-1 py-3 text-sm text-slate-600">
            {user && (
              <div className="flex items-center gap-3 px-4 py-3 mb-2 border-b border-black/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-500)] text-white font-bold">
                  {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{user.username}</p>
                  {user.email && <p className="text-xs text-slate-500">{user.email}</p>}
                </div>
              </div>
            )}
            <NavLink to="/chat" onClick={() => setMenuOpen(false)} className={({ isActive }) => `${navLinkClass({ isActive })} justify-start`}>
              Chat
            </NavLink>
            <NavLink to="/journal" onClick={() => setMenuOpen(false)} className={({ isActive }) => `${navLinkClass({ isActive })} justify-start`}>
              Journal
            </NavLink>
            <NavLink to="/dashboard" onClick={() => setMenuOpen(false)} className={({ isActive }) => `${navLinkClass({ isActive })} justify-start`}>
              Dashboard
            </NavLink>
            <button onClick={handleLogout} className="ui-btn ui-btn-danger mt-2 justify-start">
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
