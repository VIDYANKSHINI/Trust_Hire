"use client"

import React, { useState, useEffect } from "react"
import { Brief } from "@/lib/types"
import { getBrief } from "@/lib/api"
import { Lock, FileText, CheckCircle2, ShieldAlert } from "lucide-react"

interface BriefViewerProps {
  jobId: number
  briefHash: string
  canView: boolean
}

export function BriefViewer({ jobId, briefHash, canView }: BriefViewerProps) {
  const [brief, setBrief] = useState<Brief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canView) return
    setLoading(true)
    setError(null)
    getBrief(jobId)
      .then((res) => {
        setBrief(res.brief)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || "Failed to load encrypted brief")
        setLoading(false)
      })
  }, [jobId, canView])

  if (!canView) {
    return (
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded font-mono text-xs">
        <div className="flex items-center gap-2 text-neutral-400 mb-2">
          <Lock className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-neutral-200 uppercase tracking-wider">
            Confidential Job Specification
          </span>
        </div>
        <p className="text-neutral-400 text-[11px] mb-2 leading-relaxed">
          The brief is encrypted and private. Only the client and assigned freelancer can view the full specifications.
        </p>
        <div className="text-[10px] text-neutral-500 font-mono break-all bg-neutral-950 p-2 rounded border border-neutral-800">
          On-Chain Brief Hash: <span className="text-orange-400">{briefHash}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-neutral-900 border border-neutral-800 rounded font-mono text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-neutral-200 uppercase tracking-wider">Private Brief Details</span>
        </div>
        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded">
          DECRYPTED VIA WALLET SIGNATURE
        </span>
      </div>

      {loading ? (
        <div className="text-neutral-500 text-xs py-4 text-center">Decrypting brief from secure vault...</div>
      ) : error ? (
        <div className="text-red-400 text-xs flex items-center gap-2 bg-red-950/40 p-2.5 rounded border border-red-800/60">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {error}
        </div>
      ) : brief ? (
        <div className="space-y-3">
          <div>
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Scope & Description:</div>
            <div className="text-neutral-200 text-xs leading-relaxed whitespace-pre-wrap bg-neutral-950 p-3 rounded border border-neutral-800">
              {brief.description}
            </div>
          </div>

          {brief.criteria && brief.criteria.length > 0 && (
            <div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">
                Acceptance Criteria ({brief.criteria.length}):
              </div>
              <ul className="space-y-1.5">
                {brief.criteria.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 bg-neutral-950 px-2.5 py-1.5 rounded border border-neutral-800 text-[11px] text-neutral-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-[10px] text-neutral-500 font-mono break-all pt-1 border-t border-neutral-800/80">
            Verified Keccak256 Hash: <span className="text-orange-400">{briefHash}</span>
          </div>
        </div>
      ) : (
        <div className="text-neutral-500 text-xs">No brief data stored for this job.</div>
      )}
    </div>
  )
}
