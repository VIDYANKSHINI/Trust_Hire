import React from "react"
import { JobState } from "@/lib/types"

interface StatusBadgeProps {
  state: number
  className?: string
}

export function StatusBadge({ state, className = "" }: StatusBadgeProps) {
  switch (state) {
    case JobState.Funded:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border bg-amber-500/10 text-amber-400 border-amber-500/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          FUNDED (OPEN)
        </span>
      )
    case JobState.Accepted:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border bg-blue-500/10 text-blue-400 border-blue-500/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          IN PROGRESS
        </span>
      )
    case JobState.Submitted:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border bg-purple-500/10 text-purple-400 border-purple-500/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
          SUBMITTED (AI REVIEW)
        </span>
      )
    case JobState.ClientReview:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border bg-orange-500/10 text-orange-400 border-orange-500/40 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          CLIENT REVIEW WINDOW
        </span>
      )
    case JobState.Released:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ${className}`}
        >
          ✓ RELEASED (PAID)
        </span>
      )
    case JobState.Refunded:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border bg-rose-500/10 text-rose-400 border-rose-500/30 ${className}`}
        >
          ✕ REFUNDED
        </span>
      )
    case JobState.Cancelled:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border bg-neutral-800 text-neutral-400 border-neutral-700 ${className}`}
        >
          CANCELLED
        </span>
      )
    case JobState.Disputed:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border bg-red-500/15 text-red-400 border-red-500/40 ${className}`}
        >
          ⚠ DISPUTED
        </span>
      )
    case JobState.Resolved:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border bg-teal-500/10 text-teal-400 border-teal-500/30 ${className}`}
        >
          ⚖ RESOLVED
        </span>
      )
    default:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border bg-neutral-800 text-neutral-400 border-neutral-700 ${className}`}
        >
          UNKNOWN
        </span>
      )
  }
}
