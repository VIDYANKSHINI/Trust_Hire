"use client"

import { useParams, useRouter } from "next/navigation"
import { JobDetailView } from "@/components/trusthire/views/job-detail-view"

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = Number(params?.id) || 1

  return (
    <div className="min-h-screen bg-black font-mono">
      <JobDetailView
        jobId={jobId}
        onBack={() => router.push("/jobs")}
        onNavigateToArbitrator={() => router.push("/arbitrator")}
      />
    </div>
  )
}
