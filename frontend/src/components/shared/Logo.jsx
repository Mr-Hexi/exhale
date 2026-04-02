import React from 'react';

export default function Logo({ className = "" }) {
  return (
    <div className={`text-[20px] font-bold tracking-tight text-[var(--text-primary)] ${className}`}>
      ex<span className="text-[var(--brand-500)]">h</span>ale
    </div>
  );
}
