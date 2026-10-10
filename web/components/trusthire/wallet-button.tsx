"use client"

import React, { useState } from "react"
import { useAccount, useConnect, useDisconnect, useSwitchChain, injected } from "wagmi"
import { CHAIN_ID } from "@/lib/config"
import { shortAddr } from "@/lib/format"
import { MOCK_CLIENT, MOCK_FREELANCER, MOCK_ARBITRATOR } from "@/lib/mock"
import { Button } from "@/components/ui/button"
import { Wallet, LogOut, RefreshCw, ChevronDown, Check } from "lucide-react"

interface WalletButtonProps {
  onRoleChange?: (addr: string) => void
  activeSimulatedAddress?: string
}

export function WalletButton({ onRoleChange, activeSimulatedAddress }: WalletButtonProps) {
  const { address, isConnected, chainId } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const [menuOpen, setMenuOpen] = useState(false)

  const isWrongChain = isConnected && chainId !== CHAIN_ID

  const handleSimulateRole = (addr: string) => {
    if (onRoleChange) {
      onRoleChange(addr)
    }
    setMenuOpen(false)
  }

  // If wrong chain, show single switch chain button
  if (isWrongChain) {
    return (
      <Button
        onClick={() => switchChain({ chainId: CHAIN_ID })}
        variant="destructive"
        size="sm"
        className="font-mono text-xs bg-red-600 hover:bg-red-500 text-white flex items-center gap-2"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Switch to Monad Testnet (10143)
      </Button>
    )
  }

  const displayAddr = isConnected ? address : activeSimulatedAddress || MOCK_CLIENT

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs text-neutral-300">{shortAddr(address)}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => disconnect()}
              className="h-6 w-6 text-neutral-400 hover:text-red-400 ml-1"
              title="Disconnect"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => connect({ connector: injected() })}
              size="sm"
              className="font-mono text-xs bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              CONNECT WALLET
            </Button>

            {/* Simulated role toggle for mock demo */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMenuOpen(!menuOpen)}
                className="font-mono text-xs border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-1.5"
              >
                <span className="text-orange-500">ROLE:</span> {shortAddr(displayAddr)}
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
              </Button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded bg-neutral-900 border border-neutral-700 shadow-xl z-50 p-2 font-mono text-xs">
                  <div className="px-2 py-1 text-[10px] text-neutral-500 uppercase tracking-wider">
                    Simulate Wallet / Role
                  </div>
                  <button
                    onClick={() => handleSimulateRole(MOCK_CLIENT)}
                    className="w-full text-left px-2 py-1.5 hover:bg-neutral-800 rounded flex items-center justify-between text-neutral-200"
                  >
                    <div>
                      <div className="font-semibold text-orange-400">Client (Job Creator)</div>
                      <div className="text-[10px] text-neutral-500">{shortAddr(MOCK_CLIENT)}</div>
                    </div>
                    {displayAddr?.toLowerCase() === MOCK_CLIENT.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-orange-400" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSimulateRole(MOCK_FREELANCER)}
                    className="w-full text-left px-2 py-1.5 hover:bg-neutral-800 rounded flex items-center justify-between text-neutral-200 mt-1"
                  >
                    <div>
                      <div className="font-semibold text-blue-400">Freelancer (Worker)</div>
                      <div className="text-[10px] text-neutral-500">{shortAddr(MOCK_FREELANCER)}</div>
                    </div>
                    {displayAddr?.toLowerCase() === MOCK_FREELANCER.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSimulateRole(MOCK_ARBITRATOR)}
                    className="w-full text-left px-2 py-1.5 hover:bg-neutral-800 rounded flex items-center justify-between text-neutral-200 mt-1"
                  >
                    <div>
                      <div className="font-semibold text-purple-400">Arbitrator (Disputes)</div>
                      <div className="text-[10px] text-neutral-500">{shortAddr(MOCK_ARBITRATOR)}</div>
                    </div>
                    {displayAddr?.toLowerCase() === MOCK_ARBITRATOR.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSimulateRole("0x1111111111111111111111111111111111111111")}
                    className="w-full text-left px-2 py-1.5 hover:bg-neutral-800 rounded flex items-center justify-between text-neutral-200 mt-1"
                  >
                    <div>
                      <div className="font-semibold text-neutral-400">Visitor (Applicant)</div>
                      <div className="text-[10px] text-neutral-500">0x1111...1111</div>
                    </div>
                    {displayAddr?.toLowerCase() === "0x1111111111111111111111111111111111111111" && (
                      <Check className="w-3.5 h-3.5 text-neutral-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
