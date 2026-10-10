"use client"

import { useState } from "react"
import {
  ChevronRight,
  Monitor,
  Target,
  Shield,
  Users,
  Scale,
  PlusCircle,
  Bell,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PROJECT_NAME } from "@/lib/brand"
import { CHAIN_ID, EXPLORER_URL } from "@/lib/config"
import { WalletButton } from "@/components/trusthire/wallet-button"
import { OverviewView } from "@/components/trusthire/views/overview-view"
import { JobsView } from "@/components/trusthire/views/jobs-view"
import { CreateJobView } from "@/components/trusthire/views/create-job-view"
import { JobDetailView } from "@/components/trusthire/views/job-detail-view"
import { ProfileView } from "@/components/trusthire/views/profile-view"
import { ArbitratorView } from "@/components/trusthire/views/arbitrator-view"
import { MOCK_CLIENT } from "@/lib/mock"

export default function TacticalTrustHireDashboard() {
  const [activeSection, setActiveSection] = useState<
    "overview" | "jobs" | "create" | "detail" | "profile" | "arbitrator"
  >("overview")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<number>(1)
  const [simulatedAddress, setSimulatedAddress] = useState<string>(MOCK_CLIENT)

  const handleSelectJob = (id: number) => {
    setSelectedJobId(id)
    setActiveSection("detail")
  }

  const handleCreatedJob = (id: number) => {
    setSelectedJobId(id)
    setActiveSection("detail")
  }

  return (
    <div className="flex h-screen bg-black font-mono overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarCollapsed ? "w-16" : "w-72"
        } bg-neutral-900 border-r border-neutral-700 transition-all duration-300 fixed md:relative z-50 md:z-auto h-full flex flex-col justify-between`}
      >
        <div className="p-4">
          {/* Logo & Toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className={`${sidebarCollapsed ? "hidden" : "block"}`}>
              <h1 className="text-orange-500 font-bold text-lg tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-orange-500" />
                {PROJECT_NAME.toUpperCase()}
              </h1>
              <p className="text-neutral-500 text-xs">MONAD BLITZ V3 · AI ESCROW</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-neutral-400 hover:text-orange-500"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`}
              />
            </Button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {[
              { id: "overview", icon: Monitor, label: "COMMAND CENTER" },
              { id: "jobs", icon: Users, label: "ESCROW REGISTRY" },
              { id: "create", icon: PlusCircle, label: "CREATE ESCROW" },
              { id: "detail", icon: Target, label: `JOB #${selectedJobId} HUD` },
              { id: "profile", icon: Shield, label: "REPUTATION LEDGER" },
              { id: "arbitrator", icon: Scale, label: "ARBITRATION" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`w-full flex items-center gap-3 p-2.5 rounded transition-colors text-left ${
                  activeSection === item.id
                    ? "bg-orange-500 text-white font-bold"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="text-xs font-medium tracking-wide">{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Live System HUD Widget */}
          {!sidebarCollapsed && (
            <div className="mt-8 p-3.5 bg-neutral-800 border border-neutral-700 rounded text-xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-white font-bold">MONAD TESTNET LIVE</span>
              </div>
              <div className="text-[11px] text-neutral-400 space-y-0.5">
                <div>CHAIN ID: {CHAIN_ID}</div>
                <div>AI ENGINE: TYPESAFE JEV</div>
                <div>CURRENCY: NATIVE MON</div>
                <div>GHOST PROTECTION: ACTIVE</div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-neutral-800 text-[10px] text-neutral-500 flex items-center justify-between">
            <span>CODE FREEZE: 5:30 PM</span>
            <a
              href={EXPLORER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-400 flex items-center gap-1"
            >
              Explorer <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarCollapsed(true)} />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Toolbar */}
        <div className="h-16 bg-neutral-900 border-b border-neutral-700 flex items-center justify-between px-6 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <div className="text-xs md:text-sm text-neutral-400 font-mono">
              {PROJECT_NAME.toUpperCase()} /{" "}
              <span className="text-orange-500 uppercase">{activeSection}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-[11px] text-neutral-500 font-mono">
              SETTLEMENT: INSTANT MONAD
            </div>

            {/* Wallet Connect / Role Selector */}
            <WalletButton
              onRoleChange={(addr) => setSimulatedAddress(addr)}
              activeSimulatedAddress={simulatedAddress}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveSection("overview")}
              className="text-neutral-400 hover:text-orange-500 h-8 w-8"
              title="Refresh / Home"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Dynamic Section Content */}
        <div className="flex-1 overflow-auto bg-black">
          {activeSection === "overview" && (
            <OverviewView
              onNavigate={(section, jobId) => {
                if (jobId) setSelectedJobId(jobId)
                setActiveSection(section as any)
              }}
            />
          )}

          {activeSection === "jobs" && (
            <JobsView
              onSelectJob={handleSelectJob}
              onCreateJob={() => setActiveSection("create")}
            />
          )}

          {activeSection === "create" && (
            <CreateJobView
              onCreated={handleCreatedJob}
              onCancel={() => setActiveSection("jobs")}
              userAddress={simulatedAddress}
            />
          )}

          {activeSection === "detail" && (
            <JobDetailView
              jobId={selectedJobId}
              onBack={() => setActiveSection("jobs")}
              userAddress={simulatedAddress}
              onNavigateToArbitrator={() => setActiveSection("arbitrator")}
            />
          )}

          {activeSection === "profile" && <ProfileView initialAddress={simulatedAddress} />}

          {activeSection === "arbitrator" && <ArbitratorView userAddress={simulatedAddress} />}
        </div>
      </div>
    </div>
  )
}
