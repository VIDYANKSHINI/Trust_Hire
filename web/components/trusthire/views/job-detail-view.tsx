"use client"

import React, { useState, useEffect } from "react"
import { useJob, useStats, getJobRole, UserRole } from "@/lib/hooks"
import { formatMon, shortAddr, countdown, explorerAddr, explorerTx } from "@/lib/format"
import { StatusBadge } from "../status-badge"
import { StatsPill } from "../stats-pill"
import { VerdictBadge } from "../verdict-badge"
import { ReviewCountdown } from "../review-countdown"
import { BriefViewer } from "../brief-viewer"
import { DeliverableViewer } from "../deliverable-viewer"
import { DeliverableEditor } from "../deliverable-editor"
import { ApplicantList } from "../applicant-list"
import { ApplyForm } from "../apply-form"
import { TxButton } from "../tx-button"
import {
  mockAssignFreelancer,
  mockAcceptJob,
  mockCancelJob,
  mockAbandonJob,
  mockClaimRefund,
  mockApproveWork,
  mockAutoRelease,
  mockRaiseDispute,
  mockRunReview,
  MOCK_CLIENT,
  MOCK_FREELANCER,
  MOCK_ARBITRATOR,
  ZERO_ADDRESS,
} from "@/lib/mock"
import { getSummary } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ExternalLink,
  Shield,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Award,
  Lock,
} from "lucide-react"

interface JobDetailViewProps {
  jobId: number
  onBack: () => void
  userAddress?: string
  onNavigateToArbitrator?: () => void
}

export function JobDetailView({
  jobId,
  onBack,
  userAddress,
  onNavigateToArbitrator,
}: JobDetailViewProps) {
  const { job, loading, refetch } = useJob(jobId)
  const [publicSummary, setPublicSummary] = useState<string | null>(null)
  const [reviewRunning, setReviewRunning] = useState(false)
  const [simulatedRoleOverride, setSimulatedRoleOverride] = useState<UserRole | null>(null)

  // Fetch summary
  useEffect(() => {
    getSummary(jobId).then((res) => {
      if (res?.publicSummary) setPublicSummary(res.publicSummary)
    })
  }, [jobId])

  const clientStats = useStats(job?.client)
  const freelancerStats = useStats(
    job?.freelancer !== ZERO_ADDRESS ? job?.freelancer : undefined
  )

  if (loading || !job) {
    return (
      <div className="p-12 text-center text-neutral-500 font-mono">
        Loading escrow contract #{jobId}...
      </div>
    )
  }

  // Calculate viewer role
  const computedRole = getJobRole(job, userAddress || MOCK_CLIENT)
  const currentRole = simulatedRoleOverride || computedRole

  const now = Math.floor(Date.now() / 1000)
  const deadlineSeconds = Number(job.deadline)
  const deadlinePassed = now > deadlineSeconds
  const remainingDeadline = Math.max(0, deadlineSeconds - now)

  // Handlers
  const handleAssign = async (applicant: `0x${string}`) => {
    await mockAssignFreelancer(jobId, applicant)
    refetch()
  }

  const handleAccept = async () => {
    await mockAcceptJob(jobId, (userAddress || MOCK_FREELANCER) as `0x${string}`)
    refetch()
  }

  const handleCancel = async () => {
    await mockCancelJob(jobId)
    refetch()
  }

  const handleAbandon = async () => {
    await mockAbandonJob(jobId)
    refetch()
  }

  const handleClaimRefund = async () => {
    await mockClaimRefund(jobId)
    refetch()
  }

  const handleApprove = async () => {
    await mockApproveWork(jobId)
    refetch()
  }

  const handleAutoRelease = async () => {
    await mockAutoRelease(jobId)
    refetch()
  }

  const handleDispute = async () => {
    await mockRaiseDispute(jobId)
    refetch()
  }

  const handleRunReviewAgain = async () => {
    setReviewRunning(true)
    await mockRunReview(jobId)
    setReviewRunning(false)
    refetch()
  }

  // Permissions for brief & deliverable
  const canViewBrief =
    currentRole === "client" ||
    (currentRole === "freelancer" && job.state >= 1) ||
    (currentRole === "designated" && job.state === 0)

  const canViewDeliverable =
    currentRole === "freelancer" ||
    (currentRole === "client" && (job.reviewDeadline > 0n || job.state >= 3)) ||
    (currentRole === "arbitrator" && [7, 8].includes(job.state))

  return (
    <div className="p-6 space-y-6 font-mono max-w-6xl mx-auto">
      {/* Top Breadcrumb & Perspective Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <button
          onClick={onBack}
          className="text-xs text-neutral-400 hover:text-orange-400 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to registry
        </button>

        {/* Perspective Toggle (Crucial for split-screen demo & testing) */}
        <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 p-1 rounded text-xs">
          <span className="text-[10px] text-neutral-500 uppercase px-1.5">View As:</span>
          {(["client", "freelancer", "visitor", "arbitrator"] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setSimulatedRoleOverride(r)}
              className={`px-2 py-0.5 rounded text-[11px] uppercase transition-colors ${
                currentRole === r
                  ? "bg-orange-500 text-white font-bold"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Job Header HUD */}
      <div className="p-6 bg-neutral-900 border border-neutral-700 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-bold">ESCROW #{jobId.toString().padStart(3, "0")}</span>
              <StatusBadge state={job.state} />
              {job.confidenceBps > 0 && (
                <VerdictBadge jobId={jobId} confidenceBps={job.confidenceBps} />
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
              {job.title}
            </h1>
          </div>

          <div className="text-left md:text-right">
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Locked Escrow Deposit</div>
            <div className="text-2xl font-bold text-orange-400 font-mono">
              {formatMon(job.amount)}
            </div>
            <div className="text-[10px] text-neutral-500">2% protocol fee upon payout</div>
          </div>
        </div>

        {/* Public Summary */}
        {publicSummary && (
          <div className="text-xs text-neutral-300 bg-neutral-950 p-3 rounded border border-neutral-800 leading-relaxed">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-0.5">
              Public Overview:
            </span>
            {publicSummary}
          </div>
        )}

        {/* Metadata Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-800 text-xs">
          {/* Client */}
          <div className="space-y-1">
            <div className="text-[10px] text-neutral-500 uppercase">Client (Creator)</div>
            <div className="flex items-center gap-1.5">
              <a
                href={explorerAddr(job.client)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1"
              >
                {shortAddr(job.client)}
                <ExternalLink className="w-3 h-3 text-neutral-500" />
              </a>
            </div>
            <StatsPill stats={clientStats} />
          </div>

          {/* Freelancer */}
          <div className="space-y-1">
            <div className="text-[10px] text-neutral-500 uppercase">Assigned Freelancer</div>
            {job.freelancer !== ZERO_ADDRESS ? (
              <>
                <div className="flex items-center gap-1.5">
                  <a
                    href={explorerAddr(job.freelancer)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                  >
                    {shortAddr(job.freelancer)}
                    <ExternalLink className="w-3 h-3 text-neutral-500" />
                  </a>
                </div>
                <StatsPill stats={freelancerStats} />
              </>
            ) : job.designated !== ZERO_ADDRESS ? (
              <div className="text-xs text-amber-400">
                Designated: {shortAddr(job.designated)} (pending acceptance)
              </div>
            ) : (
              <div className="text-xs text-neutral-500">Open for applications</div>
            )}
          </div>

          {/* Delivery Deadline */}
          <div className="space-y-1">
            <div className="text-[10px] text-neutral-500 uppercase">Delivery Deadline</div>
            <div className={`text-sm font-bold ${deadlinePassed ? "text-red-400" : "text-neutral-200"}`}>
              {deadlinePassed ? "DEADLINE EXPIRED" : countdown(remainingDeadline)}
            </div>
            <div className="text-[10px] text-neutral-500">
              {new Date(deadlineSeconds * 1000).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Role-Specific Notification Banners */}
      {job.state === 3 && (
        <div className="p-4 bg-orange-950/40 border border-orange-500/40 rounded flex items-center justify-between text-xs text-orange-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>
              <strong>AI Review Passed:</strong> Deliverable unsealed for client review. Window countdown is running.
            </span>
          </div>
          {currentRole === "client" && (
            <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded font-bold">
              ACTION REQUIRED: APPROVE OR DISPUTE
            </span>
          )}
        </div>
      )}

      {job.state === 4 && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded flex items-center gap-2 text-xs text-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>
            <strong>Escrow Completed:</strong> Funds released to freelancer. Client retains permanent access to the deliverable.
          </span>
        </div>
      )}

      {job.state === 5 && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded flex items-center gap-2 text-xs text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>
            <strong>Escrow Refunded:</strong> Full deposit returned to client. Freelancer reputation updated with abandoned mark.
          </span>
        </div>
      )}

      {job.state === 7 && (
        <div className="p-4 bg-purple-950/40 border border-purple-500/40 rounded flex items-center justify-between text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            <span>
              <strong>Under Arbitration:</strong> Awaiting resolution by designated arbitrator wallet.
            </span>
          </div>
          {currentRole === "arbitrator" && onNavigateToArbitrator && (
            <Button
              onClick={onNavigateToArbitrator}
              size="sm"
              className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] h-7"
            >
              Open Arbitration Console
            </Button>
          )}
        </div>
      )}

      {/* Main Grid: Left Column (Action Matrix), Right Column (Brief & Deliverable) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* STATE 0: FUNDED */}
          {job.state === 0 && (
            <>
              {currentRole === "client" ? (
                <div className="space-y-4">
                  <ApplicantList jobId={jobId} onAssign={handleAssign} />
                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">No applicants yet or changed mind?</span>
                    <TxButton
                      label="Cancel Escrow & Refund Deposit"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className="border-neutral-700 text-neutral-400 hover:text-red-400"
                    />
                  </div>
                </div>
              ) : currentRole === "designated" ? (
                <div className="p-5 bg-neutral-900 border border-orange-500 rounded space-y-3">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Award className="w-5 h-5" />
                    <h3 className="text-sm font-bold tracking-wider">YOU WERE SELECTED BY THE CLIENT!</h3>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Review the confidential brief below. When ready to commit, accept the escrow contract.
                  </p>
                  <TxButton
                    label="ACCEPT ESCROW CONTRACT"
                    onClick={handleAccept}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5"
                  />
                </div>
              ) : (
                <ApplyForm jobId={jobId} applicantAddress={userAddress as `0x${string}`} />
              )}
            </>
          )}

          {/* STATE 1: ACCEPTED */}
          {job.state === 1 && (
            <>
              {currentRole === "freelancer" ? (
                <DeliverableEditor
                  jobId={jobId}
                  onSubmitSuccess={refetch}
                  onAbandon={handleAbandon}
                />
              ) : currentRole === "client" ? (
                <div className="p-5 bg-neutral-900 border border-neutral-700 rounded space-y-3">
                  <h3 className="text-sm font-bold text-neutral-200 tracking-wider">
                    WORK IN PROGRESS
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    The freelancer is actively executing the brief. Once submitted, Jev AI decision engine will
                    automatically review the work and calculate confidence score.
                  </p>
                  <div className="pt-3 border-t border-neutral-800">
                    <TxButton
                      label="CLAIM REFUND (DEADLINE MISSED)"
                      onClick={handleClaimRefund}
                      disabled={!deadlinePassed}
                      className="w-full bg-red-900 hover:bg-red-800 text-white text-xs disabled:opacity-40"
                    />
                    <p className="text-[10px] text-neutral-500 text-center mt-1.5">
                      {deadlinePassed
                        ? "Deadline has expired! You are entitled to immediate 100% refund."
                        : `Refund unlocked if deadline passes without delivery (${countdown(remainingDeadline)} remaining).`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-400">
                  Escrow accepted. Freelancer is executing against the delivery deadline.
                </div>
              )}
            </>
          )}

          {/* STATE 2: SUBMITTED (AI REVIEWING) */}
          {job.state === 2 && (
            <div className="p-5 bg-neutral-900 border border-purple-500/60 rounded space-y-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles className="w-5 h-5 animate-spin" />
                <h3 className="text-sm font-bold tracking-wider">AI DECISION MODEL EVALUATING WORK</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                The deliverable is being benchmarked by TypeSafe Jev (with LLM fallback) against acceptance criteria.
                A verdict score will set the client review window.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <TxButton
                  label="Trigger / Re-run AI Review"
                  onClick={handleRunReviewAgain}
                  disabled={reviewRunning}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                />
                {(currentRole === "client" || currentRole === "freelancer") && (
                  <TxButton
                    label="Raise Dispute"
                    variant="outline"
                    onClick={handleDispute}
                    className="border-neutral-700 text-neutral-400 hover:text-red-400 text-xs"
                  />
                )}
              </div>
            </div>
          )}

          {/* STATE 3: CLIENT REVIEW WINDOW */}
          {job.state === 3 && (
            <div className="space-y-4">
              <ReviewCountdown
                reviewDeadline={job.reviewDeadline}
                confidenceBps={job.confidenceBps}
                onAutoRelease={handleAutoRelease}
              />

              {currentRole === "client" && (
                <div className="p-4 bg-neutral-900 border border-neutral-700 rounded space-y-3">
                  <h4 className="text-xs font-bold text-neutral-200 tracking-wider">
                    CLIENT DECISION CONSOLE
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <TxButton
                      label="APPROVE WORK & PAY"
                      onClick={handleApprove}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      icon={<CheckCircle className="w-4 h-4" />}
                    />
                    <TxButton
                      label="RAISE DISPUTE"
                      variant="destructive"
                      onClick={handleDispute}
                      className="bg-red-700 hover:bg-red-600 text-white font-bold"
                      icon={<AlertTriangle className="w-4 h-4" />}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 text-center">
                    Approve releases funds minus 2% fee. Dispute freezes funds for the arbitrator.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STATE 4: RELEASED */}
          {job.state === 4 && (
            <div className="p-5 bg-neutral-900 border border-emerald-700/60 rounded space-y-3">
              <h3 className="text-sm font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> SETTLEMENT COMPLETE
              </h3>
              <div className="text-xs text-neutral-300 space-y-1">
                <div>Escrow Amount: {formatMon(job.amount)}</div>
                <div>Protocol Fee (2%): {formatMon(job.amount * 200n / 10000n)}</div>
                <div className="font-bold text-emerald-400">
                  Freelancer Payout: {formatMon(job.amount * 9800n / 10000n)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Confidential Vault (Brief & Deliverable) */}
        <div className="lg:col-span-5 space-y-4">
          <BriefViewer
            jobId={jobId}
            briefHash={job.briefHash}
            canView={canViewBrief}
          />

          {(job.state >= 2 || job.deliverableHash !== ZERO_ADDRESS) && (
            <DeliverableViewer
              jobId={jobId}
              deliverableHash={job.deliverableHash}
              canView={canViewDeliverable}
            />
          )}
        </div>
      </div>
    </div>
  )
}
