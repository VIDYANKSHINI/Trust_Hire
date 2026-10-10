"use client"

import { useRouter } from "next/navigation"
import { JobsView } from "@/components/trusthire/views/jobs-view"

export default function JobsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black font-mono">
      <JobsView
        onSelectJob={(id) => router.push(`/jobs/${id}`)}
        onCreateJob={() => router.push("/jobs/new")}
      />
    </div>
  )
}
