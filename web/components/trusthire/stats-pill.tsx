import React from "react"
import { Stats } from "@/lib/types"

interface StatsPillProps {
  stats: Stats
  label?: string
  className?: string
}

export function StatsPill({ stats, label, className = "" }: StatsPillProps) {
  return (
    <div
      className={`inline-flex items-center gap-3 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded font-mono text-xs ${className}`}
    >
      {label && <span className="text-neutral-500 font-bold tracking-wider">{label}</span>}
      <span className="text-emerald-400 flex items-center gap-1" title="Completed jobs">
        <span className="text-emerald-500">✓</span> {stats.completed}
      </span>
      <span className="text-amber-400 flex items-center gap-1" title="Ghosted by client (autoRelease triggered)">
        <span className="text-amber-500">⚠</span> {stats.ghosted}
      </span>
      <span className="text-rose-400 flex items-center gap-1" title="Abandoned by freelancer / missed deadline">
        <span className="text-rose-500">✕</span> {stats.abandoned}
      </span>
      {stats.disputed > 0 && (
        <span className="text-purple-400 flex items-center gap-1" title="Disputes involved in">
          <span className="text-purple-500">⚖</span> {stats.disputed}
        </span>
      )}
    </div>
  )
}
