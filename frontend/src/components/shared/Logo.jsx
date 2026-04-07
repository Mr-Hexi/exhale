import React from 'react';

export default function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 text-[20px] font-bold tracking-tight text-[var(--text-primary)] ${className}`}>
      <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(31,122,106,0.12)] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(223,241,235,0.92)_45%,rgba(31,122,106,0.14)_100%)] shadow-[0_10px_24px_rgba(31,122,106,0.16)]">
        <div className="absolute inset-[2px] rounded-[14px] bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(223,241,235,0.72))]" />
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="relative h-5 w-5 text-[var(--brand-600)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.8 4.5c-4.4 2.8-7.4 7.3-8.2 12.5h4.8L12 27.5c4.4-2.8 7.4-7.3 8.2-12.5h-4.8l4.4-10.5Z"
            fill="url(#exhale-logo-mark)"
          />
          <path
            d="M19.8 4.5c-4.4 2.8-7.4 7.3-8.2 12.5h4.8L12 27.5c4.4-2.8 7.4-7.3 8.2-12.5h-4.8l4.4-10.5Z"
            stroke="rgba(16,94,78,0.18)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="exhale-logo-mark" x1="11.6" y1="5" x2="22.6" y2="26.6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2bb58e" />
              <stop offset="1" stopColor="#175e52" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="leading-none">
        ex<span className="text-[var(--brand-500)]">h</span>ale
      </div>
    </div>
  );
}
