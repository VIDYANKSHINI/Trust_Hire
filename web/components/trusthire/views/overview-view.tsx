"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Sparkles, Clock, Lock, CheckCircle2, ArrowRight, ExternalLink } from "lucide-react"
import { EXPLORER_URL, CONTRACT_ADDRESS, CHAIN_ID, NATIVE_SYMBOL } from "@/lib/config"
import { shortAddr } from "@/lib/format"
import { PROJECT_NAME } from "@/lib/brand"

interface OverviewViewProps {
  onNavigate: (section: string, jobId?: number) => void
}

export function OverviewView({ onNavigate }: OverviewViewProps) {
  return (
    <div className="p-6 space-y-8 font-mono">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-neutral-900 border border-neutral-700 rounded-lg p-6 md:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-orange-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            MONAD TESTNET · CHAIN ID {CHAIN_ID}
          </div>

          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white uppercase">
            Escrow where silence can&apos;t hold your money hostage.
          </h1>

          <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
            An AI decision model suggests who to hire and checks the work. The client keeps the last word. Neither
            side can ghost the other and win: a silent client&apos;s funds auto-release, while an abandoned freelancer
            triggers a full refund and reputation penalty.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={() => onNavigate("jobs")}
              className="bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs px-5 py-2.5 flex items-center gap-2"
            >
              EXPLORE ACTIVE ESCROWS
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate("create")}
              className="border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white font-mono text-xs px-5 py-2.5"
            >
              + CREATE NEW ESCROW
            </Button>
          </div>
        </div>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <CardTitle className="text-sm font-bold text-neutral-200 tracking-wider">
              1. AI SUGGESTS THE FREELANCER
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-neutral-400 leading-relaxed">
            Freelancers submit proposals against your public summary. TypeSafe Jev AI scores applicants against your
            confidential brief and acceptance criteria across skills, experience, and scope fit. You keep the final choice.
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <CardTitle className="text-sm font-bold text-neutral-200 tracking-wider">
              2. CONFIDENCE SETS REVIEW WINDOW
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-neutral-400 leading-relaxed">
            Delivered work is evaluated by Jev AI. The probability verdict dynamically sets the client review window:
            high confidence (≥95%) enables a fast window, while lower confidence opens a longer window. AI never releases funds alone.
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardHeader className="pb-3">
            <div className="w-10 h-10 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <CardTitle className="text-sm font-bold text-neutral-200 tracking-wider">
              3. PRIVATE BY DESIGN
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-neutral-400 leading-relaxed">
            Only Keccak256 hashes touch the Monad blockchain. Full briefs and deliverables are encrypted server-side with
            AES-256-GCM and gated strictly by cryptographic wallet signatures.
          </CardContent>
        </Card>
      </div>

      {/* How We Differ Table */}
      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader className="border-b border-neutral-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-neutral-200 tracking-wider">
                HOW WE DIFFER (THE COMPARISON)
              </CardTitle>
              <p className="text-xs text-neutral-500 mt-1">
                Why existing escrow models fail and how {PROJECT_NAME} solves both-sided ghosting.
              </p>
            </div>
            <span className="text-xs font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded">
              MONAD BLITZ SPEC
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400">
                <th className="py-2.5 px-3 font-semibold">FEATURE / SCENARIO</th>
                <th className="py-2.5 px-3 font-semibold">BASIC ESCROW</th>
                <th className="py-2.5 px-3 font-semibold">AI-VERIFIED ESCROW</th>
                <th className="py-2.5 px-3 font-semibold text-orange-400 bg-orange-500/10 rounded-t">
                  {PROJECT_NAME} (OURS)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              <tr>
                <td className="py-2.5 px-3 font-medium text-neutral-400">Who judges the work</td>
                <td className="py-2.5 px-3 text-neutral-500">Client only</td>
                <td className="py-2.5 px-3 text-neutral-500">AI decides &amp; releases funds</td>
                <td className="py-2.5 px-3 text-white font-semibold bg-orange-500/5">
                  AI returns probability; <strong className="text-orange-400">client keeps final word</strong>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-neutral-400">What AI changes</td>
                <td className="py-2.5 px-3 text-neutral-500">Nothing</td>
                <td className="py-2.5 px-3 text-neutral-500">Releases or refunds money</td>
                <td className="py-2.5 px-3 text-white font-semibold bg-orange-500/5">
                  <strong className="text-orange-400">Sets client review window</strong>; low score goes to dispute
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-neutral-400">Hiring suggestion</td>
                <td className="py-2.5 px-3 text-neutral-500">None</td>
                <td className="py-2.5 px-3 text-neutral-500">None</td>
                <td className="py-2.5 px-3 text-white font-semibold bg-orange-500/5">
                  <strong className="text-orange-400">Yes</strong>: AI scores applicants vs private brief
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-neutral-400">Client ghosts</td>
                <td className="py-2.5 px-3 text-neutral-500">Fixed timeout release</td>
                <td className="py-2.5 px-3 text-neutral-500">Varies</td>
                <td className="py-2.5 px-3 text-white font-semibold bg-orange-500/5">
                  Timeout release + <strong className="text-amber-400">&quot;ghosted&quot; stat</strong>; client keeps work
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-neutral-400">Freelancer ghosts</td>
                <td className="py-2.5 px-3 text-neutral-500">Funds locked or manual dispute</td>
                <td className="py-2.5 px-3 text-neutral-500">Varies</td>
                <td className="py-2.5 px-3 text-white font-semibold bg-orange-500/5">
                  Cancel / Abandon / Deadline refund + <strong className="text-rose-400">&quot;abandoned&quot; stat</strong>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-neutral-400">Brief &amp; Deliverable</td>
                <td className="py-2.5 px-3 text-neutral-500">Public or plaintext</td>
                <td className="py-2.5 px-3 text-neutral-500">Public URL evidence</td>
                <td className="py-2.5 px-3 text-white font-semibold bg-orange-500/5">
                  <strong className="text-orange-400">Hashes on-chain</strong>; encrypted &amp; wallet-gated
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-neutral-400">Reputation</td>
                <td className="py-2.5 px-3 text-neutral-500">None</td>
                <td className="py-2.5 px-3 text-neutral-500">Sometimes off-chain</td>
                <td className="py-2.5 px-3 text-white font-semibold bg-orange-500/5">
                  <strong className="text-emerald-400">On-chain for both sides</strong> (completed, ghosted, abandoned)
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 5-Step Process Strip */}
      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-neutral-200 tracking-wider">
            HOW IT WORKS — 5-STEP PROTOCOL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
              <div className="text-orange-500 font-bold mb-1">01 // CREATE &amp; DEPOSIT</div>
              <p className="text-neutral-400 text-[11px]">
                Client funds job with native MON. Brief hashed on-chain, text encrypted off-chain.
              </p>
            </div>
            <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
              <div className="text-orange-500 font-bold mb-1">02 // AI MATCHING</div>
              <p className="text-neutral-400 text-[11px]">
                Freelancers apply off-chain. Jev scores proposals and client assigns the winner.
              </p>
            </div>
            <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
              <div className="text-orange-500 font-bold mb-1">03 // SUBMISSION</div>
              <p className="text-neutral-400 text-[11px]">
                Freelancer accepts and submits work. Hash recorded on-chain, work sealed.
              </p>
            </div>
            <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
              <div className="text-orange-500 font-bold mb-1">04 // AI VERDICT</div>
              <p className="text-neutral-400 text-[11px]">
                Jev inspects work vs criteria. Probability score sets the client review window length.
              </p>
            </div>
            <div className="bg-neutral-950 p-3 rounded border border-neutral-800">
              <div className="text-orange-500 font-bold mb-1">05 // RELEASE OR TIMEOUT</div>
              <p className="text-neutral-400 text-[11px]">
                Client approves OR if silent, auto-release triggers. Freelancer receives payment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tactical Status Footer */}
      <div className="p-4 bg-neutral-900 border border-neutral-700 rounded flex flex-col md:flex-row items-center justify-between text-xs text-neutral-400 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>ESCROW ENGINE ACTIVE ON MONAD TESTNET</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>
            Contract:{" "}
            <a
              href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 font-mono inline-flex items-center gap-1"
            >
              {shortAddr(CONTRACT_ADDRESS)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </span>
          <span>Currency: {NATIVE_SYMBOL}</span>
        </div>
      </div>
    </div>
  )
}
