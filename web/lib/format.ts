import { EXPLORER_URL } from "./config"

export function shortAddr(address?: string | null): string {
  if (!address || address === "0x0000000000000000000000000000000000000000") return "0x00...0000"
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatMon(wei?: bigint | string | number | null): string {
  if (wei === undefined || wei === null) return "0 MON"
  try {
    const b = typeof wei === "bigint" ? wei : BigInt(wei.toString())
    // 1 MON = 10^18 wei
    const divisor = 10n ** 18n
    const whole = b / divisor
    const remainder = b % divisor
    if (remainder === 0n) return `${whole.toString()} MON`
    const remStr = remainder.toString().padStart(18, "0").slice(0, 4)
    const trimmed = remStr.replace(/0+$/, "")
    return trimmed.length > 0 ? `${whole.toString()}.${trimmed} MON` : `${whole.toString()} MON`
  } catch {
    return "0 MON"
  }
}

export function explorerTx(hash?: string): string {
  if (!hash) return EXPLORER_URL
  return `${EXPLORER_URL}/tx/${hash}`
}

export function explorerAddr(addr?: string): string {
  if (!addr) return EXPLORER_URL
  return `${EXPLORER_URL}/address/${addr}`
}

export function countdown(secondsRemaining: number | bigint): string {
  const sec = Number(secondsRemaining)
  if (sec <= 0) return "00:00"
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)

  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}
