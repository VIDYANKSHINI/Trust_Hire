"use client"

import React, { useState } from "react"
import { useStats } from "@/lib/hooks"
import { shortAddr, explorerAddr } from "@/lib/format"
import { MOCK_CLIENT, MOCK_FREELANCER } from "@/lib/mock"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, AlertTriangle, XCircle, Scale, ExternalLink, Shield, Search } from "lucide-react"

interface ProfileViewProps {
  initialAddress?: string
}

export function ProfileView({ initialAddress }: ProfileViewProps) {
  const [lookupAddress, setLookupAddress] = useState(initialAddress || MOCK_CLIENT)
  const [activeAddress, setActiveAddress] = useState(initialAddress || MOCK_CLIENT)

  const stats = useStats(activeAddress)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (lookupAddress.trim()) {
      setActiveAddress(lookupAddress.trim())
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 font-mono">
      {/* Header & Lookup */}
      <div className="bg-neutral-900 border border-neutral-700 p-6 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 text-xs font-semibold mb-1">
              <Shield className="w-3.5 h-3.5" /> ON-CHAIN REPUTATION LEDGER
            </div>
            <h2 className="text-xl font-bold text-white tracking-wider">
              {shortAddr(activeAddress)}
            </h2>
            <div className="text-xs text-neutral-500 break-all">{activeAddress}</div>
          </div>

          <a
            href={explorerAddr(activeAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 border border-neutral-700 bg-neutral-800 px-3 py-1.5 rounded"
          >
            Explorer Account <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Search any address */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <Input
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
            placeholder="Search address (0x...) to view reputation"
            className="bg-neutral-950 border-neutral-800 text-neutral-200 text-xs font-mono focus-visible:ring-orange-500"
          />
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" /> Inspect
          </Button>
        </form>

        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>Quick check:</span>
          <button
            type="button"
            onClick={() => {
              setLookupAddress(MOCK_CLIENT)
              setActiveAddress(MOCK_CLIENT)
            }}
            className="text-orange-400 hover:underline"
          >
            Client Profile
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => {
              setLookupAddress(MOCK_FREELANCER)
              setActiveAddress(MOCK_FREELANCER)
            }}
            className="text-blue-400 hover:underline"
          >
            Freelancer Profile
          </button>
        </div>
      </div>

      {/* 4 Large Tactical Stat Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completed */}
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-semibold uppercase">COMPLETED JOBS</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400 font-mono mb-1">
              {stats.completed}
            </div>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Successfully delivered escrows released on Monad testnet.
            </p>
          </CardContent>
        </Card>

        {/* Ghosted */}
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-semibold uppercase">GHOSTED BY CLIENT</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400 font-mono mb-1">
              {stats.ghosted}
            </div>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Times client went silent and review window timed out into autoRelease.
            </p>
          </CardContent>
        </Card>

        {/* Abandoned */}
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-semibold uppercase">ABANDONED JOBS</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-400 font-mono mb-1">
              {stats.abandoned}
            </div>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Times freelancer quit prematurely or missed delivery deadline.
            </p>
          </CardContent>
        </Card>

        {/* Disputes */}
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-semibold uppercase">DISPUTES</span>
              <Scale className="w-4 h-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400 font-mono mb-1">
              {stats.disputed}
            </div>
            <p className="text-[11px] text-neutral-500 leading-snug">
              Escrows referred to arbitrator due to AI rejection or contract conflict.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Explanatory Note */}
      <div className="p-4 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-400 leading-relaxed">
        <strong className="text-neutral-200">How Anti-Ghosting Reputation Works:</strong> In TrustHire, reputation is
        enforced directly by the smart contract mapping <code className="text-orange-400">stats(address)</code>. Neither
        party can manipulate their score. If a client refuses to review completed work, the autoRelease function
        increments their ghosted counter while safely paying the freelancer.
      </div>
    </div>
  )
}
