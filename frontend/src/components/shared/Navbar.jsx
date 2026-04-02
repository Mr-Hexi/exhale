import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between relative z-10">
      <Link to="/chat" className="font-bold text-indigo-600 text-lg tracking-tight">
        🌬️ Exhale
      </Link>

      {/* Desktop nav */}
      <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
        <Link to="/chat" className="hover:text-indigo-600 transition-colors">Chat</Link>
        <Link to="/journal" className="hover:text-indigo-600 transition-colors">Journal</Link>
        <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(prev => !prev)}
        className="sm:hidden text-gray-500 hover:text-indigo-600 transition-colors"
        aria-label="Toggle menu"
      >
        {menuOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-sm flex flex-col text-sm text-gray-600 sm:hidden">
          <Link to="/chat" onClick={() => setMenuOpen(false)} className="px-4 py-3 hover:bg-gray-50">Chat</Link>
          <Link to="/journal" onClick={() => setMenuOpen(false)} className="px-4 py-3 hover:bg-gray-50">Journal</Link>
          <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="px-4 py-3 hover:bg-gray-50">Dashboard</Link>
          <button onClick={handleLogout} className="px-4 py-3 text-left text-red-400 hover:bg-gray-50">Logout</button>
        </div>
      )}
    </nav>
  );
}