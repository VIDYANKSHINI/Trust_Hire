import { Address } from "./types"

const TOKEN_KEY = "th_token"

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setSessionToken(token: string): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch (err) {
    console.error("Failed to save token to sessionStorage", err)
  }
}

export function clearSessionToken(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export async function authFetch(
  url: string,
  options: RequestInit = {},
  signFn?: (msg: string) => Promise<string>,
  address?: Address
): Promise<Response> {
  let token = getSessionToken()

  // If no token and signFn is provided, attempt auto sign-in
  if (!token && signFn && address) {
    try {
      token = await signInWithWallet(address, (args) => signFn(args.message))
    } catch (e) {
      console.warn("Wallet sign-in skipped or failed", e)
    }
  }

  const headers = new Headers(options.headers || {})
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  let res = await fetch(url, { ...options, headers })

  // On 401 re-run sign-in once if signFn is available
  if (res.status === 401 && signFn && address) {
    clearSessionToken()
    try {
      token = await signInWithWallet(address, (args) => signFn(args.message))
      headers.set("Authorization", `Bearer ${token}`)
      res = await fetch(url, { ...options, headers })
    } catch (e) {
      console.error("Auto re-auth failed", e)
    }
  }

  return res
}

export async function signInWithWallet(
  address: Address,
  signMessageAsync: (args: { message: string }) => Promise<string>
): Promise<string> {
  const isMock = process.env.NEXT_PUBLIC_MOCK === "1"
  if (isMock) {
    const fakeToken = `mock_jwt_token_${address.toLowerCase()}_${Date.now()}`
    setSessionToken(fakeToken)
    return fakeToken
  }

  try {
    // 1. GET /api/auth/nonce?address=0x..
    const nonceRes = await fetch(`/api/auth/nonce?address=${address.toLowerCase()}`)
    if (!nonceRes.ok) {
      // Fallback for demo when backend route isn't live yet
      const fallbackToken = `mock_session_${address.slice(0, 8)}`
      setSessionToken(fallbackToken)
      return fallbackToken
    }
    const { message } = await nonceRes.json()

    // 2. signMessage
    const signature = await signMessageAsync({ message })

    // 3. POST /api/auth/verify
    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: address.toLowerCase(), signature }),
    })

    if (!verifyRes.ok) {
      throw new Error("Signature verification failed")
    }

    const { token } = await verifyRes.json()
    setSessionToken(token)
    return token
  } catch (err) {
    console.warn("Real auth flow failed; falling back to session stub", err)
    const stubToken = `fallback_token_${address.toLowerCase()}`
    setSessionToken(stubToken)
    return stubToken
  }
}
