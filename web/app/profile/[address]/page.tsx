"use client"

import { useParams } from "next/navigation"
import { ProfileView } from "@/components/trusthire/views/profile-view"

export default function ProfilePage() {
  const params = useParams()
  const address = typeof params?.address === "string" ? params.address : undefined

  return (
    <div className="min-h-screen bg-black font-mono">
      <ProfileView initialAddress={address} />
    </div>
  )
}
