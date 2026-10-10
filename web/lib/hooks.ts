"use client"

import { useState, useEffect, useCallback } from "react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi"
import { parseEther } from "viem"
import { CONTRACT_ADDRESS, CHAIN_ID } from "./config"
import { trustHireAbi } from "./abi"
import { Job, Stats, Address, JobState } from "./types"
import {
  mockGetJob,
  mockGetJobCount,
  mockGetAllJobs,
  mockDb,
  mockCreateJob,
  mockAssignFreelancer,
  mockAcceptJob,
  mockCancelJob,
  mockAbandonJob,
  mockClaimRefund,
  mockSubmitWork,
  mockApproveWork,
  mockAutoRelease,
  mockRaiseDispute,
  mockResolveDispute,
  MOCK_CLIENT,
  MOCK_ARBITRATOR,
} from "./mock"

export function useIsMockMode() {
  const { isConnected } = useAccount()
  // If NEXT_PUBLIC_MOCK is explicitly 1, OR if user hasn't connected a real wallet, mock mode allows testing everything seamlessly!
  return process.env.NEXT_PUBLIC_MOCK === "1" || !isConnected
}

export function useJobCount() {
  const isMock = useIsMockMode()
  const [count, setCount] = useState<number>(8)

  const { data, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: trustHireAbi,
    functionName: "jobCount",
    query: {
      enabled: !isMock,
      refetchInterval: 5000,
    },
  })

  useEffect(() => {
    if (isMock) {
      mockGetJobCount().then(setCount)
    } else if (data !== undefined) {
      setCount(Number(data))
    }
  }, [isMock, data])

  return { count, refetch }
}

export function useAllJobs() {
  const [jobs, setJobs] = useState<{ id: number; job: Job }[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const list = await mockGetAllJobs()
    setJobs(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 4000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  return { jobs, loading, refetch: fetchJobs }
}

export function useJob(id: number) {
  const isMock = useIsMockMode()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  const { data, refetch: refetchContract } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: trustHireAbi,
    functionName: "getJob",
    args: [BigInt(id)],
    query: {
      enabled: !isMock && id > 0,
      refetchInterval: 3000,
    },
  })

  const loadMock = useCallback(async () => {
    const j = await mockGetJob(id)
    setJob(j)
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (isMock) {
      loadMock()
      const interval = setInterval(loadMock, 3000)
      return () => clearInterval(interval)
    } else if (data) {
      setJob(data as unknown as Job)
      setLoading(false)
    }
  }, [isMock, id, data, loadMock])

  return {
    job,
    loading,
    refetch: isMock ? loadMock : refetchContract,
  }
}

export function useStats(address?: string | null) {
  const isMock = useIsMockMode()
  const [stats, setStats] = useState<Stats>({ completed: 0, ghosted: 0, abandoned: 0, disputed: 0 })

  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: trustHireAbi,
    functionName: "stats",
    args: address ? [address as Address] : undefined,
    query: {
      enabled: !isMock && !!address,
    },
  })

  useEffect(() => {
    if (!address) return
    if (isMock) {
      setStats(mockDb.getStats(address))
    } else if (data) {
      const [completed, ghosted, abandoned, disputed] = data as unknown as [number, number, number, number]
      setStats({ completed, ghosted, abandoned, disputed })
    }
  }, [isMock, address, data])

  return stats
}

export type UserRole = "client" | "freelancer" | "designated" | "arbitrator" | "visitor"

export function getJobRole(
  job: Job | null,
  activeAddress?: string | null,
  arbitratorAddress: string = MOCK_ARBITRATOR
): UserRole {
  if (!job || !activeAddress) return "visitor"
  const a = activeAddress.toLowerCase()
  if (a === job.client.toLowerCase()) return "client"
  if (job.freelancer !== "0x0000000000000000000000000000000000000000" && a === job.freelancer.toLowerCase())
    return "freelancer"
  if (job.designated !== "0x0000000000000000000000000000000000000000" && a === job.designated.toLowerCase())
    return "designated"
  if (a === arbitratorAddress.toLowerCase()) return "arbitrator"
  return "visitor"
}

// Write mutation helper hook
export function useContractActions() {
  const { isConnected, address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const isMock = useIsMockMode()

  const [status, setStatus] = useState<"idle" | "wallet" | "waiting" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const isWrongChain = isConnected && chainId !== CHAIN_ID

  const executeAction = async (
    actionName: string,
    realFn: () => Promise<`0x${string}` | void>,
    mockFn: () => Promise<any>
  ) => {
    setStatus("wallet")
    setErrorMsg(null)
    setTxHash(null)

    try {
      if (isMock) {
        setStatus("waiting")
        await mockFn()
        setStatus("success")
        setTxHash("0x" + Math.random().toString(16).slice(2).padStart(64, "0"))
        return true
      } else {
        if (isWrongChain) {
          throw new Error("Please switch to Monad Testnet (Chain ID 10143)")
        }
        setStatus("wallet")
        const hash = await realFn()
        if (hash) {
          setTxHash(hash as string)
          setStatus("waiting")
        }
        setStatus("success")
        return true
      }
    } catch (err: any) {
      console.error(`Error during ${actionName}:`, err)
      setStatus("error")
      // Extract custom error name if present
      const msg = err.shortMessage || err.message || "Transaction failed"
      setErrorMsg(msg)
      return false
    }
  }

  return {
    status,
    errorMsg,
    txHash,
    isWrongChain,
    switchChain: () => switchChain({ chainId: CHAIN_ID }),
    executeAction,
    reset: () => {
      setStatus("idle")
      setErrorMsg(null)
      setTxHash(null)
    },
  }
}
