"use client"

import React, { useState } from "react"
import { submitApplication } from "@/lib/api"
import { Address } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { TxButton } from "./tx-button"
import { Send, CheckCircle2, User } from "lucide-react"

interface ApplyFormProps {
  jobId: number
  applicantAddress: Address
  onApplied?: () => void
}

export function ApplyForm({ jobId, applicantAddress, onApplied }: ApplyFormProps) {
  const [pitch, setPitch] = useState("")
  const [skillsRaw, setSkillsRaw] = useState("")
  const [applied, setApplied] = useState(false)

  const handleSubmit = async () => {
    if (!pitch.trim()) throw new Error("Pitch is required")
    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 8)

    await submitApplication(jobId, pitch, skills, applicantAddress)
    setApplied(true)
    if (onApplied) onApplied()
  }

  if (applied) {
    return (
      <div className="p-5 bg-neutral-900 border border-emerald-700/60 rounded font-mono space-y-3">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h4 className="text-sm font-bold tracking-wider">APPLICATION SENT</h4>
        </div>
        <p className="text-xs text-neutral-400">
          Your proposal is stored in the escrow applicant pool. The client will review applications with AI matching.
        </p>
        <div className="bg-neutral-950 p-3 rounded border border-neutral-800 text-xs text-neutral-300">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Your Submitted Pitch:</div>
          {pitch}
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 bg-neutral-900 border border-neutral-700 rounded font-mono space-y-4">
      <div className="border-b border-neutral-800 pb-3">
        <h3 className="text-sm font-bold text-neutral-200 tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-orange-500" />
          APPLY FOR THIS ESCROW JOB
        </h3>
        <p className="text-[11px] text-neutral-500">
          Submit your proposal. The AI decision engine will evaluate your pitch against the private brief.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-neutral-400 uppercase tracking-wider">
          Proposal Pitch ({pitch.length}/1000)
        </label>
        <Textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value.slice(0, 1000))}
          placeholder="Explain your relevant background, timeline, and how you will meet the acceptance criteria..."
          rows={4}
          className="bg-neutral-950 border-neutral-800 text-neutral-200 text-xs focus-visible:ring-orange-500 font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-neutral-400 uppercase tracking-wider">
          Skills (comma-separated, max 8)
        </label>
        <Input
          value={skillsRaw}
          onChange={(e) => setSkillsRaw(e.target.value)}
          placeholder="e.g. Solidity, Hardhat, Security Audits, Monad, Rust"
          className="bg-neutral-950 border-neutral-800 text-neutral-200 text-xs focus-visible:ring-orange-500 font-mono"
        />
      </div>

      <TxButton
        label="SUBMIT APPLICATION"
        onClick={handleSubmit}
        disabled={!pitch.trim()}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
        icon={<Send className="w-3.5 h-3.5" />}
      />
    </div>
  )
}
