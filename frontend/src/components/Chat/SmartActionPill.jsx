// src/components/Chat/SmartActionPill.jsx
import { useState } from "react"

export default function SmartActionPill({ smartAction }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!smartAction) return null

  return (
    <div className="mt-2 ml-1 max-w-[75%]">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors"
      >
        <span>{isOpen ? "✕" : "💡"}</span>
        {smartAction.label}
      </button>

      {isOpen && (
        <div className="mt-2 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-800 whitespace-pre-line">
          {smartAction.content}
        </div>
      )}
    </div>
  )
}