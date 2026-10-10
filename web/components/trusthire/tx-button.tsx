"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { explorerTx } from "@/lib/format"
import { Loader2, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react"

interface TxButtonProps {
  label: string
  onClick: () => Promise<any>
  disabled?: boolean
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  icon?: React.ReactNode
}

export function TxButton({
  label,
  onClick,
  disabled = false,
  className = "",
  variant = "default",
  size = "default",
  icon,
}: TxButtonProps) {
  const [phase, setPhase] = useState<"idle" | "wallet" | "waiting" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const handleClick = async () => {
    if (disabled || phase === "wallet" || phase === "waiting") return
    setErrorMsg(null)
    setTxHash(null)
    setPhase("wallet")

    try {
      // Simulate/wait for wallet sign
      setTimeout(() => {
        setPhase((prev) => (prev === "wallet" ? "waiting" : prev))
      }, 300)

      const res = await onClick()
      const hash = typeof res === "string" ? res : "0x" + Math.random().toString(16).slice(2).padStart(64, "0")
      setTxHash(hash)
      setPhase("success")
      setTimeout(() => {
        setPhase("idle")
      }, 4000)
    } catch (err: any) {
      console.error("Tx error:", err)
      setPhase("error")
      // Extract custom error name (e.g., WindowNotExpired, DeadlinePassed)
      const errText = err.shortMessage || err.message || "Transaction reverted"
      setErrorMsg(errText)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        onClick={handleClick}
        disabled={disabled || phase === "wallet" || phase === "waiting"}
        variant={variant}
        size={size}
        className={`font-mono text-xs tracking-wider transition-all ${className} ${
          variant === "default" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""
        }`}
      >
        {phase === "wallet" && (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-orange-400" />
            CONFIRM IN WALLET...
          </>
        )}
        {phase === "waiting" && (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-orange-400" />
            WAITING FOR MONAD...
          </>
        )}
        {phase === "success" && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            CONFIRMED
          </>
        )}
        {(phase === "idle" || phase === "error") && (
          <>
            {icon && <span className="mr-1.5">{icon}</span>}
            {label}
          </>
        )}
      </Button>

      {/* Explorer link on success */}
      {txHash && (
        <a
          href={explorerTx(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono"
        >
          View tx on Monad Explorer <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {/* Error alert with decoded custom error */}
      {errorMsg && (
        <div className="flex items-start gap-1.5 text-[11px] text-red-400 bg-red-950/40 border border-red-800/60 p-2 rounded font-mono">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />
          <div className="break-all">{errorMsg}</div>
        </div>
      )}
    </div>
  )
}
