"use client"

import React, { useState } from "react"
import { useAllJobs } from "@/lib/hooks"
import { JobCard } from "../job-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Plus, Filter, Loader2 } from "lucide-react"

interface JobsViewProps {
  onSelectJob: (id: number) => void
  onCreateJob: () => void
}

export function JobsView({ onSelectJob, onCreateJob }: JobsViewProps) {
  const { jobs, loading } = useAllJobs()
  const [filter, setFilter] = useState<"all" | "open" | "inprogress" | "done" | "disputed">("all")
  const [search, setSearch] = useState("")

  const filteredJobs = jobs.filter(({ job }) => {
    // State filter
    if (filter === "open" && job.state !== 0) return false
    if (filter === "inprogress" && ![1, 2, 3].includes(job.state)) return false
    if (filter === "done" && ![4, 5, 6, 8].includes(job.state)) return false
    if (filter === "disputed" && job.state !== 7) return false

    // Search filter
    if (search.trim() && !job.title.toLowerCase().includes(search.toLowerCase())) {
      return false
    }

    return true
  })

  return (
    <div className="p-6 space-y-6 font-mono">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-neutral-900 p-4 border border-neutral-700 rounded">
        <div>
          <h2 className="text-base font-bold text-neutral-100 tracking-wider">
            ESCROW JOB REGISTRY ({jobs.length})
          </h2>
          <p className="text-xs text-neutral-500">
            Smart contract escrows on Monad Testnet with AI review windows.
          </p>
        </div>

        <Button
          onClick={onCreateJob}
          className="bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> CREATE NEW ESCROW
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            className={`text-xs font-mono h-8 ${
              filter === "all"
                ? "bg-orange-500 text-white"
                : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            All ({jobs.length})
          </Button>

          <Button
            size="sm"
            variant={filter === "open" ? "default" : "outline"}
            onClick={() => setFilter("open")}
            className={`text-xs font-mono h-8 ${
              filter === "open"
                ? "bg-amber-500 text-black font-semibold"
                : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Open / Funded ({jobs.filter((j) => j.job.state === 0).length})
          </Button>

          <Button
            size="sm"
            variant={filter === "inprogress" ? "default" : "outline"}
            onClick={() => setFilter("inprogress")}
            className={`text-xs font-mono h-8 ${
              filter === "inprogress"
                ? "bg-blue-600 text-white"
                : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            In Progress ({jobs.filter((j) => [1, 2, 3].includes(j.job.state)).length})
          </Button>

          <Button
            size="sm"
            variant={filter === "done" ? "default" : "outline"}
            onClick={() => setFilter("done")}
            className={`text-xs font-mono h-8 ${
              filter === "done"
                ? "bg-emerald-600 text-white"
                : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Settled ({jobs.filter((j) => [4, 5, 6, 8].includes(j.job.state)).length})
          </Button>

          <Button
            size="sm"
            variant={filter === "disputed" ? "default" : "outline"}
            onClick={() => setFilter("disputed")}
            className={`text-xs font-mono h-8 ${
              filter === "disputed"
                ? "bg-red-600 text-white"
                : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            Disputed ({jobs.filter((j) => j.job.state === 7).length})
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs..."
            className="pl-9 h-8 bg-neutral-900 border-neutral-700 text-xs text-neutral-200 focus-visible:ring-orange-500 font-mono"
          />
        </div>
      </div>

      {/* Job list grid */}
      {loading ? (
        <div className="p-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          <span>Polling jobs from Monad RPC...</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900 border border-neutral-800 rounded">
          <p className="text-xs text-neutral-500 mb-3">No escrow jobs found matching your filters.</p>
          <Button
            onClick={onCreateJob}
            variant="outline"
            className="text-xs font-mono border-neutral-700 text-orange-400 hover:bg-neutral-800"
          >
            Create the first job
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map(({ id, job }) => (
            <JobCard key={id} id={id} job={job} onSelect={(selectedId) => onSelectJob(selectedId)} />
          ))}
        </div>
      )}
    </div>
  )
}
