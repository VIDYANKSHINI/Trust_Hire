"use client"

import React, { useEffect, useState } from "react"
import { Provider } from "@/lib/types"
import { getVerdict } from "@/lib/api"
import { CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react"

interface VerdictBadgeProps {
  jobId: number
  confidenceBps: number
  className?: string
}

export function VerdictBadge({ jobId, confidenceBps, className = "" }: VerdictBadgeProps) {
  const [verdict, setVerdict] = useState<{
    provider: Provider
    confidenceBps: number
    pass: boolean
  } | null>(null)

  useEffect(() => {
    getVerdict(jobId).then((v) => {
      if (v) setVerdict(v)
    })
  }, [jobId])

  const confPercent = verdict ? (verdict.confidenceBps / 100).toFixed(0) : (confidenceBps / 100).toFixed(0)
  const provider = verdict?.provider || "jev"

  if (provider === "error" || (verdict && !verdict.pass)) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/60 border border-red-700/60 text-red-300 font-mono text-xs ${className}`}
      >
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <span>Review failed — sent to dispute</span>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded bg-orange-950/40 border border-orange-500/40 text-orange-200 font-mono text-xs ${className}`}
    >
      <ShieldCheck className="w-4 h-4 text-orange-400" />
      <span>
        Reviewed by <strong className="text-orange-400 uppercase">{provider === "llm" ? "LLM" : "Jev"}</strong> ·{" "}
        {confPercent}% confidence
      </span>
    </div>
  )
}
