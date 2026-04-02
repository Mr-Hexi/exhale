import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer({ className = "" }) {
  return (
    <footer className={`w-full mx-auto px-6 sm:px-10 py-6 border border-[rgba(23,33,43,0.08)] rounded-[1.25rem] sm:rounded-[1.75rem] bg-[var(--bg-surface)]/20 backdrop-blur-xl shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[13px] text-[var(--text-muted)] font-medium">
        <div className="flex items-center gap-2">
          <Logo className="!text-[15px]" />
          <span className="opacity-50 mx-1">|</span>
          &copy; {new Date().getFullYear()} All rights reserved.
        </div>
        <div className="flex gap-6">
          <Link to="#" className="hover:text-[var(--brand-500)] transition-colors">Privacy</Link>
          <Link to="#" className="hover:text-[var(--brand-500)] transition-colors">Terms</Link>
          <Link to="#" className="hover:text-[var(--brand-500)] transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
