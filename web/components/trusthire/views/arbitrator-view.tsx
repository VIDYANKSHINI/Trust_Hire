"use client"

import React, { useState } from "react"
import { useAllJobs } from "@/lib/hooks"
import { formatMon, shortAddr } from "@/lib/format"
import { DeliverableViewer } from "../deliverable-viewer"
import { TxButton } from "../tx-button"
import { mockResolveDispute, MOCK_ARBITRATOR } from "@/lib/mock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Scale, AlertTriangle, ShieldCheck, CheckCircle2, Lock } from "lucide-react"

interface ArbitratorViewProps {
  userAddress?: string
}

export function ArbitratorView({ userAddress }: ArbitratorViewProps) {
  const { jobs, refetch } = useAllJobs()
  const disputedJobs = jobs.filter(({ job }) => job.state === 7)

  const [selectedJobId, setSelectedJobId] = useState<number | null>(
    disputedJobs[0]?.id || null
  )
  const [freelancerShare, setFreelancerShare] = useState<number>(70) // Default 70%
  const [resolved, setResolved] = useState(false)

  const activeJobItem = jobs.find((j) => j.id === selectedJobId)

  const isArbitratorWallet =
    !userAddress || userAddress.toLowerCase() === MOCK_ARBITRATOR.toLowerCase()

  const handleResolve = async () => {
    if (!selectedJobId) return
    const shareBps = freelancerShare * 100
    await mockResolveDispute(selectedJobId, shareBps)
    setResolved(true)
    refetch()
  }

  if (!isArbitratorWallet) {
    return (
      <div className="p-12 max-w-xl mx-auto text-center font-mono space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800 flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-red-400">ACCESS RESTRICTED</h2>
        <p className="text-xs text-neutral-400">
          Only the authorized arbitrator wallet ({shortAddr(MOCK_ARBITRATOR)}) can access dispute resolution
          tools. Please switch to the Arbitrator role via the wallet button.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 font-mono">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-lg">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-1">
          <Scale className="w-4 h-4" /> ARBITRATION CONSOLE (PROTOCOL ARBITRATOR)
        </div>
        <h2 className="text-xl font-bold text-neutral-100 tracking-wider">
          DISPUTED ESCROWS ({disputedJobs.length})
        </h2>
        <p className="text-xs text-neutral-500">
          Arbitrate jobs where AI rejected the deliverable or either party escalated. Inspect work and determine
          fund splits.
        </p>
      </div>

      {disputedJobs.length === 0 ? (
        <div className="p-12 text-center bg-neutral-950 border border-neutral-800 rounded">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-neutral-200">No Active Disputes</h3>
          <p className="text-xs text-neutral-500 mt-1">All escrows are currently running smoothly or settled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dispute selector list */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
              Select Disputed Case
            </h3>
            {disputedJobs.map(({ id, job }) => (
              <div
                key={id}
                onClick={() => {
                  setSelectedJobId(id)
                  setResolved(false)
                }}
                className={`p-3.5 rounded border cursor-pointer transition-colors ${
                  selectedJobId === id
                    ? "bg-purple-950/30 border-purple-500"
                    : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-purple-300">Case #{id}</span>
                  <span className="font-bold text-orange-400">{formatMon(job.amount)}</span>
                </div>
                <div className="text-xs text-neutral-300 font-semibold line-clamp-1">{job.title}</div>
                <div className="text-[10px] text-neutral-500 mt-1 flex justify-between">
                  <span>Client: {shortAddr(job.client)}</span>
                  <span>FL: {shortAddr(job.freelancer)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Dispute details and split slider */}
          <div className="lg:col-span-8 space-y-6">
            {activeJobItem && (
              <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-lg space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-purple-400 font-bold uppercase">
                      Case #{activeJobItem.id} Details
                    </span>
                    <span className="text-sm font-bold text-orange-400">
                      Amount: {formatMon(activeJobItem.job.amount)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{activeJobItem.job.title}</h3>
                </div>

                {/* Privacy constraint notice per BUILD_frontend.md §Module F7 */}
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded text-[11px] text-neutral-400 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Privacy Rule:</strong> Brief details remain confidential. The arbitrator inspects the
                    unsealed deliverable text directly below to assess technical merit and determine fair split.
                  </div>
                </div>

                {/* Deliverable Viewer */}
                <div>
                  <DeliverableViewer
                    jobId={activeJobItem.id}
                    deliverableHash={activeJobItem.job.deliverableHash}
                    canView={true}
                  />
                </div>

                {/* Fund Allocation Slider */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-neutral-300 font-semibold uppercase tracking-wider">
                      Arbitrated Split: Freelancer Share
                    </label>
                    <span className="text-base font-bold text-purple-400">
                      {freelancerShare}% Freelancer · {100 - freelancerShare}% Client
                    </span>
                  </div>

                  <Slider
                    value={[freelancerShare]}
                    onValueChange={(val) => setFreelancerShare(val[0])}
                    min={0}
                    max={100}
                    step={10}
                    className="py-2"
                  />

                  <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-neutral-800">
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <div className="text-[10px] text-neutral-500 uppercase">Freelancer Receives</div>
                      <div className="text-sm font-bold text-blue-400">
                        {formatMon((activeJobItem.job.amount * BigInt(freelancerShare * 100)) / 10000n)}
                      </div>
                    </div>
                    <div className="bg-neutral-900 p-2.5 rounded border border-neutral-800">
                      <div className="text-[10px] text-neutral-500 uppercase">Client Refund</div>
                      <div className="text-sm font-bold text-orange-400">
                        {formatMon((activeJobItem.job.amount * BigInt((100 - freelancerShare) * 100)) / 10000n)}
                      </div>
                    </div>
                  </div>
                </div>

                {resolved ? (
                  <div className="p-4 bg-emerald-950/60 border border-emerald-600 rounded text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Dispute resolved successfully on-chain! Funds distributed accordingly.</span>
                  </div>
                ) : (
                  <TxButton
                    label={`EXECUTE RESOLVE (${freelancerShare}% / ${100 - freelancerShare}%)`}
                    onClick={handleResolve}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3"
                    icon={<Scale className="w-4 h-4" />}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
