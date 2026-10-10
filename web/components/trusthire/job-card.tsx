"use client"

import React, { useEffect, useState } from "react"
import { Job } from "@/lib/types"
import { formatMon, shortAddr, countdown } from "@/lib/format"
import { StatusBadge } from "./status-badge"
import { getSummary } from "@/lib/api"
import { Calendar, User, ArrowUpRight } from "lucide-react"

interface JobCardProps {
  id: number
  job: Job
  onSelect?: (id: number) => void
}

export function JobCard({ id, job, onSelect }: JobCardProps) {
  const [summary, setSummary] = useState<string | null>(null)

  useEffect(() => {
    getSummary(id).then((res) => {
      if (res?.publicSummary) setSummary(res.publicSummary)
    })
  }, [id])

  const now = Math.floor(Date.now() / 1000)
  const remaining = Math.max(0, Number(job.deadline) - now)

  return (
    <div
      onClick={() => onSelect && onSelect(id)}
      className="p-5 bg-neutral-900 border border-neutral-700 hover:border-orange-500/80 rounded transition-all cursor-pointer group font-mono flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-bold">#{id.toString().padStart(3, "0")}</span>
            <StatusBadge state={job.state} />
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-orange-400 group-hover:text-orange-300">
              {formatMon(job.amount)}
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-neutral-100 group-hover:text-orange-400 transition-colors line-clamp-2 mb-2">
          {job.title}
        </h3>

        {summary && (
          <p className="text-xs text-neutral-400 line-clamp-2 mb-3 bg-neutral-950/80 p-2 rounded border border-neutral-800">
            {summary}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
        <div className="flex items-center gap-1.5" title="Job Client">
          <User className="w-3.5 h-3.5 text-neutral-500" />
          <span>{shortAddr(job.client)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-neutral-500" />
          <span>{remaining > 0 ? `${countdown(remaining)} left` : "Deadline passed"}</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-orange-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform ml-1" />
        </div>
      </div>
    </div>
  )
}
