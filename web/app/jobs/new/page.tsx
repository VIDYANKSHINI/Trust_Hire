"use client"

import { useRouter } from "next/navigation"
import { CreateJobView } from "@/components/trusthire/views/create-job-view"

export default function NewJobPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black font-mono">
      <CreateJobView
        onCreated={(newId) => router.push(`/jobs/${newId}`)}
        onCancel={() => router.push("/jobs")}
      />
    </div>
  )
}
