"use client"

import React, { useState, useEffect } from "react"
import { getDeliverable } from "@/lib/api"
import { FileCode, Lock, CheckCircle, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DeliverableViewerProps {
  jobId: number
  deliverableHash: string
  canView: boolean
}

export function DeliverableViewer({ jobId, deliverableHash, canView }: DeliverableViewerProps) {
  const [data, setData] = useState<{ content: string; hash: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canView) return
    setLoading(true)
    setError(null)
    getDeliverable(jobId)
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || "Failed to load deliverable")
        setLoading(false)
      })
  }, [jobId, canView])

  const handleCopy = () => {
    if (data?.content) {
      navigator.clipboard.writeText(data.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!canView) {
    return (
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded font-mono text-xs">
        <div className="flex items-center gap-2 text-neutral-400 mb-2">
          <Lock className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-neutral-200 uppercase tracking-wider">
            Deliverable Locked by Escrow
          </span>
        </div>
        <p className="text-neutral-400 text-[11px] mb-2 leading-relaxed">
          The delivered work is encrypted and sealed. The client gains access only once the AI review verdict passes
          and the Client Review window opens.
        </p>
        <div className="text-[10px] text-neutral-500 font-mono break-all bg-neutral-950 p-2 rounded border border-neutral-800">
          On-Chain Deliverable Hash: <span className="text-orange-400">{deliverableHash}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-neutral-900 border border-neutral-800 rounded font-mono text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-neutral-200 uppercase tracking-wider">
            Submitted Deliverable
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 text-[10px] text-neutral-400 hover:text-white"
          >
            {copied ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Copied
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Copy className="w-3 h-3" /> Copy Raw
              </span>
            )}
          </Button>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded">
            SEAL VERIFIED
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-neutral-500 text-xs py-4 text-center">Fetching submitted work from vault...</div>
      ) : error ? (
        <div className="text-red-400 text-xs bg-red-950/40 p-2.5 rounded border border-red-800/60">{error}</div>
      ) : data ? (
        <div className="space-y-2">
          <pre className="text-neutral-200 text-xs leading-relaxed whitespace-pre-wrap bg-neutral-950 p-3 rounded border border-neutral-800 max-h-72 overflow-y-auto">
            {data.content}
          </pre>
          <div className="text-[10px] text-neutral-500 font-mono break-all">
            Verified Keccak256 Hash: <span className="text-emerald-400">{data.hash}</span>
          </div>
        </div>
      ) : (
        <div className="text-neutral-500 text-xs">No deliverable uploaded yet.</div>
      )}
    </div>
  )
}
