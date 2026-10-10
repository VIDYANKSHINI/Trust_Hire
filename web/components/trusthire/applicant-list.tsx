"use client"

import React, { useState, useEffect } from "react"
import { Application, Address } from "@/lib/types"
import { getApplications, rankApplications } from "@/lib/api"
import { shortAddr } from "@/lib/format"
import { StatsPill } from "./stats-pill"
import { TxButton } from "./tx-button"
import { Button } from "@/components/ui/button"
import { Sparkles, UserCheck, Award, ExternalLink, Loader2 } from "lucide-react"
import Link from "next/link"

interface ApplicantListProps {
  jobId: number
  onAssign: (applicant: Address) => Promise<any>
}

export function ApplicantList({ jobId, onAssign }: ApplicantListProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState(false)
  const [recommended, setRecommended] = useState<Address | null>(null)

  useEffect(() => {
    getApplications(jobId).then((apps) => {
      setApplications(apps)
      setLoading(false)
      // Check if any already recommended
      if (apps.length > 0 && apps[0].matchScore !== null) {
        setRecommended(apps[0].applicant)
      }
    })
  }, [jobId])

  const handleRank = async () => {
    setRanking(true)
    try {
      const res = await rankApplications(jobId)
      setApplications(res.applications)
      setRecommended(res.recommended)
    } catch (e) {
      console.error("Ranking error:", e)
    } finally {
      setRanking(false)
    }
  }

  if (loading) {
    return <div className="text-neutral-500 font-mono text-xs py-4 text-center">Loading applicant pool...</div>
  }

  return (
    <div className="space-y-4 font-mono">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900 p-4 border border-neutral-700 rounded">
        <div>
          <h3 className="text-sm font-bold text-neutral-200 tracking-wider">
            APPLICANTS ({applications.length})
          </h3>
          <p className="text-[11px] text-neutral-500">
            Freelancers who submitted proposals against your public summary.
          </p>
        </div>

        {applications.length > 0 && (
          <Button
            onClick={handleRank}
            disabled={ranking}
            className="bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs flex items-center gap-1.5"
          >
            {ranking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Scoring applicants with Jev AI...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-white" />
                SUGGEST BEST FREELANCER (AI)
              </>
            )}
          </Button>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="p-8 text-center bg-neutral-950 border border-neutral-800 rounded">
          <p className="text-xs text-neutral-500">No applicants yet. Share this job or apply as a test visitor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app, idx) => {
            const isRec = recommended?.toLowerCase() === app.applicant.toLowerCase()
            return (
              <div
                key={idx}
                className={`p-4 rounded border transition-all ${
                  isRec
                    ? "bg-neutral-900 border-orange-500 shadow-md shadow-orange-500/10"
                    : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/profile/${app.applicant}`}
                      className="text-orange-400 hover:text-orange-300 font-bold text-xs flex items-center gap-1"
                    >
                      {shortAddr(app.applicant)}
                      <ExternalLink className="w-3 h-3 text-neutral-500" />
                    </Link>
                    <StatsPill stats={app.stats} />
                    {isRec && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white tracking-wider">
                        <Award className="w-3 h-3" />
                        AI RECOMMENDED
                      </span>
                    )}
                  </div>

                  <TxButton
                    label="ASSIGN FREELANCER"
                    onClick={() => onAssign(app.applicant)}
                    size="sm"
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
                    icon={<UserCheck className="w-3.5 h-3.5 text-orange-400" />}
                  />
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed mb-3 bg-neutral-900/60 p-2.5 rounded border border-neutral-800/80">
                  {app.pitch}
                </p>

                {/* Skills tags */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {app.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded text-[10px] border border-neutral-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Match Score & breakdown */}
                {app.matchScore !== null ? (
                  <div className="pt-3 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-neutral-400 font-semibold">OVERALL MATCH</span>
                        <span className="text-orange-400 font-bold">{app.matchScore}%</span>
                      </div>
                      <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-orange-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${app.matchScore}%` }}
                        />
                      </div>
                    </div>

                    {app.matchDetail && (
                      <>
                        <div className="text-[10px] text-neutral-400">
                          <span className="text-neutral-500">Skills Fit:</span>{" "}
                          <strong className="text-neutral-200">{app.matchDetail.skillsFit}%</strong>
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          <span className="text-neutral-500">Experience Fit:</span>{" "}
                          <strong className="text-neutral-200">{app.matchDetail.experienceFit}%</strong>
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          <span className="text-neutral-500">Scope Fit:</span>{" "}
                          <strong className="text-neutral-200">{app.matchDetail.scopeFit}%</strong>
                        </div>
                      </>
                    )}

                    <div className="col-span-full sm:col-span-1 text-right text-[10px] text-neutral-500">
                      Scored by{" "}
                      <span className="text-orange-400 font-semibold uppercase">
                        {app.provider === "llm" ? "LLM" : "Jev"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-neutral-500 pt-2 border-t border-neutral-800/80">
                    Not scored yet. Click &apos;Suggest best freelancer (AI)&apos; to score.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="text-[10px] text-neutral-500 text-center pt-2">
        AI scores are advisory. You choose who to assign.
      </div>
    </div>
  )
}
