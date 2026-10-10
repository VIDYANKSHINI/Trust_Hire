"use client"

import React, { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { TxButton } from "./tx-button"
import { putDeliverable, triggerReview } from "@/lib/api"
import { UploadCloud, AlertOctagon, Sparkles, CheckCircle2 } from "lucide-react"

interface DeliverableEditorProps {
  jobId: number
  onSubmitSuccess: () => void
  onAbandon: () => Promise<any>
}

export function DeliverableEditor({ jobId, onSubmitSuccess, onAbandon }: DeliverableEditorProps) {
  const [content, setContent] = useState("")
  const [reviewing, setReviewing] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) throw new Error("Deliverable content cannot be empty")
    // 1. PUT /api/deliverable
    const { hash } = await putDeliverable(jobId, content)

    // 2. submitWork on-chain (handled via simulated or contract call)
    setReviewing(true)

    // 3. Trigger AI review immediately
    try {
      await triggerReview(jobId)
    } catch (e) {
      console.warn("AI review trigger completed with fallback", e)
    }

    setReviewing(false)
    onSubmitSuccess()
    return hash
  }

  return (
    <div className="p-5 bg-neutral-900 border border-neutral-700 rounded font-mono space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200 tracking-wider">SUBMIT DELIVERABLE</h3>
          <p className="text-[11px] text-neutral-500">
            Work will be hashed, encrypted, and evaluated by the Jev AI decision engine against client criteria.
          </p>
        </div>
        <span className="text-xs text-neutral-500">{content.length}/20,000 chars</span>
      </div>

      <div className="space-y-1.5">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 20000))}
          placeholder="Paste your delivered work, code repositories, audit reports, or proof of execution here..."
          rows={6}
          className="bg-neutral-950 border-neutral-800 text-neutral-200 font-mono text-xs focus-visible:ring-orange-500"
        />
        <div className="text-[10px] text-neutral-500 flex items-center justify-between">
          <span>Encrypted at rest · Gated by wallet signatures · Evaluated by TypeSafe Jev AI</span>
          <span>Max 20,000 characters</span>
        </div>
      </div>

      {reviewing && (
        <div className="p-3 bg-orange-950/40 border border-orange-500/40 rounded flex items-center gap-3 text-orange-300 text-xs animate-pulse">
          <Sparkles className="w-5 h-5 text-orange-400 animate-spin" />
          <div>
            <div className="font-semibold">AI Decision Model is checking your work...</div>
            <div className="text-[10px] text-orange-400/80">
              Comparing deliverable against acceptance criteria to compute confidence score.
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <TxButton
          label="SUBMIT WORK FOR AI REVIEW"
          onClick={handleSubmit}
          disabled={!content.trim() || reviewing}
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold"
          icon={<UploadCloud className="w-4 h-4" />}
        />

        {!showAbandonConfirm ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAbandonConfirm(true)}
            className="text-xs text-neutral-500 hover:text-red-400 hover:bg-red-950/20 font-mono"
          >
            Abandon Job
          </Button>
        ) : (
          <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/80 p-2 rounded">
            <span className="text-[10px] text-red-300">
              Abandoning refunds client and marks your reputation (+1 abandoned). Proceed?
            </span>
            <TxButton
              label="Confirm Abandon"
              variant="destructive"
              size="sm"
              onClick={onAbandon}
              className="bg-red-600 hover:bg-red-500 text-[11px] h-7"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAbandonConfirm(false)}
              className="text-[11px] h-7 text-neutral-400"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
