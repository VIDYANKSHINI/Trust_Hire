"use client"

import React, { useState } from "react"
import { CriteriaEditor } from "../criteria-editor"
import { TxButton } from "../tx-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Brief, Address } from "@/lib/types"
import { mockCreateJob, MOCK_CLIENT } from "@/lib/mock"
import { putBrief } from "@/lib/api"
import { parseEther } from "viem"
import { Shield, Sparkles, Clock, Coins, FileText, ArrowLeft, Info } from "lucide-react"

interface CreateJobViewProps {
  onCreated: (jobId: number) => void
  onCancel: () => void
  userAddress?: string
}

export function CreateJobView({ onCreated, onCancel, userAddress }: CreateJobViewProps) {
  const [title, setTitle] = useState("")
  const [publicSummary, setPublicSummary] = useState("")
  const [description, setDescription] = useState("")
  const [criteria, setCriteria] = useState<string[]>([
    "Complete implementation satisfying all functional test suites",
    "Code delivered with deployment documentation and verified on Monad Explorer",
  ])
  const [amountMon, setAmountMon] = useState("0.05")
  const [deadlineDate, setDeadlineDate] = useState(() => {
    // Default to +2 days from now in datetime-local format
    const d = new Date(Date.now() + 86400 * 2 * 1000)
    return d.toISOString().slice(0, 16)
  })

  // Quick deadline setter helper
  const setQuickDeadline = (seconds: number) => {
    const d = new Date(Date.now() + seconds * 1000)
    setDeadlineDate(d.toISOString().slice(0, 16))
  }

  const handleSubmit = async () => {
    if (!title.trim()) throw new Error("Title is required")
    if (!publicSummary.trim()) throw new Error("Public summary is required")
    if (!description.trim()) throw new Error("Private brief is required")
    if (criteria.filter((c) => c.trim().length > 0).length === 0) {
      throw new Error("At least 1 acceptance criteria is required")
    }

    const amt = parseFloat(amountMon)
    if (isNaN(amt) || amt <= 0) throw new Error("Amount must be greater than 0 MON")

    const deadlineTimestamp = Math.floor(new Date(deadlineDate).getTime() / 1000)
    if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
      throw new Error("Deadline must be in the future")
    }

    const briefObj: Brief = {
      description,
      criteria: criteria.filter((c) => c.trim().length > 0),
    }

    const wei = parseEther(amountMon)
    const client = (userAddress || MOCK_CLIENT) as Address

    // Create job (mock or real contract call)
    const newJobId = await mockCreateJob(
      title,
      briefObj,
      publicSummary,
      wei,
      BigInt(deadlineTimestamp),
      client
    )

    // Store brief off-chain
    await putBrief(newJobId, briefObj, publicSummary)

    onCreated(newJobId)
    return newJobId
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <button
            onClick={onCancel}
            className="text-xs text-neutral-500 hover:text-orange-400 flex items-center gap-1 mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to registry
          </button>
          <h2 className="text-xl font-bold text-neutral-100 tracking-wider">
            CREATE ESCROW CONTRACT
          </h2>
          <p className="text-xs text-neutral-500">
            Deposit native MON into TrustHire escrow with cryptographic brief sealing.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 text-xs">
          <Shield className="w-3.5 h-3.5" />
          <span>FUNDS LOCKED AT CREATION</span>
        </div>
      </div>

      <div className="space-y-6 bg-neutral-900 border border-neutral-700 p-6 rounded-lg">
        {/* Title */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">
              Job Title ({title.length}/80)
            </label>
            <span className="text-[10px] text-neutral-500">Stored on-chain</span>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="e.g. Audit Monad Testnet Escrow Engine & Gas Profiling"
            className="bg-neutral-950 border-neutral-800 text-neutral-200 text-xs focus-visible:ring-orange-500"
          />
        </div>

        {/* Public Summary */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">
              Public Summary ({publicSummary.length}/280)
            </label>
            <span className="text-[10px] text-amber-400 font-semibold">Visible to everyone</span>
          </div>
          <Textarea
            value={publicSummary}
            onChange={(e) => setPublicSummary(e.target.value.slice(0, 280))}
            placeholder="Brief overview visible to all applicants. Do not include private credentials or confidential details here."
            rows={2}
            className="bg-neutral-950 border-neutral-800 text-neutral-200 text-xs focus-visible:ring-orange-500"
          />
          <p className="text-[10px] text-neutral-500 flex items-center gap-1">
            <Info className="w-3 h-3 text-neutral-500" />
            Applicants read this summary to submit their initial pitch.
          </p>
        </div>

        {/* Confidential Brief */}
        <div className="space-y-1.5 pt-2 border-t border-neutral-800">
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-500" />
              Detailed Private Brief ({description.length}/4000)
            </label>
            <span className="text-[10px] text-emerald-400 font-semibold">
              Encrypted &amp; Wallet-Gated
            </span>
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 4000))}
            placeholder="Full private brief, specifications, internal repo requirements, and secret test parameters. Only you and your chosen freelancer will ever have access to this text."
            rows={5}
            className="bg-neutral-950 border-neutral-800 text-neutral-200 text-xs focus-visible:ring-orange-500"
          />
          <p className="text-[10px] text-neutral-500">
            A Keccak256 hash is computed and stored on Monad. Plaintext is encrypted server-side with AES-256-GCM.
          </p>
        </div>

        {/* Acceptance Criteria */}
        <div className="pt-2 border-t border-neutral-800">
          <CriteriaEditor criteria={criteria} onChange={setCriteria} />
        </div>

        {/* Amount & Deadline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs text-neutral-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-orange-500" />
              Deposit Amount (Native MON)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.001"
              value={amountMon}
              onChange={(e) => setAmountMon(e.target.value)}
              className="bg-neutral-950 border-neutral-800 text-neutral-200 text-xs focus-visible:ring-orange-500 font-mono"
            />
            <p className="text-[10px] text-neutral-500">
              Locked in escrow. 2% fee applied on successful release. 100% refunded if cancelled.
            </p>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-neutral-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                Delivery Deadline
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuickDeadline(180)}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-[10px] text-orange-400 rounded"
                >
                  +3 min
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(600)}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-[10px] text-orange-400 rounded"
                >
                  +10 min
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(86400)}
                  className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-[10px] text-orange-400 rounded"
                >
                  +1 day
                </button>
              </div>
            </div>
            <Input
              type="datetime-local"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="bg-neutral-950 border-neutral-800 text-neutral-200 text-xs focus-visible:ring-orange-500 font-mono"
            />
            <p className="text-[10px] text-neutral-500">
              Demo shortcuts allow testing timeout and deadline refund scenarios live.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-neutral-400 hover:text-white text-xs font-mono"
          >
            Cancel
          </Button>

          <TxButton
            label={`DEPOSIT ${amountMon} MON & LAUNCH ESCROW`}
            onClick={handleSubmit}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6"
            icon={<Sparkles className="w-4 h-4" />}
          />
        </div>
      </div>
    </div>
  )
}
