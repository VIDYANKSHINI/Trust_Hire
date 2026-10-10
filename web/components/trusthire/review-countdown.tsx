"use client"

import React, { useState, useEffect } from "react"
import { countdown } from "@/lib/format"
import { TxButton } from "./tx-button"
import { Clock, Unlock, AlertCircle } from "lucide-react"

interface ReviewCountdownProps {
  reviewDeadline: bigint
  confidenceBps: number
  onAutoRelease: () => Promise<any>
}

export function ReviewCountdown({
  reviewDeadline,
  confidenceBps,
  onAutoRelease,
}: ReviewCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, Number(reviewDeadline) - now)
  })

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = Math.max(0, Number(reviewDeadline) - now)
      setSecondsLeft(diff)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [reviewDeadline])

  const isExpired = secondsLeft <= 0
  const isHighConfidence = confidenceBps >= 9500

  return (
    <div className="p-4 bg-neutral-900 border border-neutral-700 rounded space-y-3 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isExpired ? "text-amber-500" : "text-orange-500 animate-pulse"}`} />
          <span className="text-xs text-neutral-300 tracking-wider">CLIENT REVIEW WINDOW</span>
        </div>
        <div className={`text-lg font-bold ${isExpired ? "text-amber-400" : "text-orange-400 font-mono"}`}>
          {isExpired ? "00:00 EXPIRED" : `${countdown(secondsLeft)} LEFT`}
        </div>
      </div>

      <div className="text-[11px] text-neutral-400 leading-relaxed bg-neutral-950 p-2.5 rounded border border-neutral-800">
        <div className="flex items-center gap-1.5 text-neutral-300 font-semibold mb-1">
          <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
          Window length dynamically calibrated by AI confidence:
        </div>
        <div>
          {isHighConfidence ? (
            <span className="text-emerald-400 font-semibold">≥95% High confidence → 30s short window</span>
          ) : (
            <span className="text-amber-400 font-semibold">&lt;95% Standard confidence → 90s long window</span>
          )}{" "}
          <span className="text-neutral-500">(Production target: 24h / 48h)</span>
        </div>
      </div>

      {isExpired && (
        <div className="pt-2 border-t border-neutral-800">
          <div className="mb-2 text-xs text-amber-300 font-semibold flex items-center gap-1.5">
            <Unlock className="w-4 h-4 text-amber-400" />
            Window expired. Client was silent: funds unlocked for auto-release!
          </div>
          <TxButton
            label="RELEASE FUNDS (ANYONE CAN CLICK)"
            onClick={onAutoRelease}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5"
            icon={<Unlock className="w-4 h-4" />}
          />
          <p className="text-[10px] text-neutral-500 text-center mt-1">
            Silence = Acceptance. Client keeps the deliverable, freelancer receives payment minus 2% fee.
          </p>
        </div>
      )}
    </div>
  )
}
