import type React from "react"
import type { Metadata } from "next"
import { Geist_Mono as GeistMono } from "next/font/google"
import "./globals.css"
import { Web3Provider } from "@/components/web3-provider"
import { PROJECT_NAME } from "@/lib/brand"

const geistMono = GeistMono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: `${PROJECT_NAME} — AI Escrow on Monad Testnet`,
  description:
    "Escrow where silence can't hold your money hostage. TypeSafe AI decision models suggest who to hire and review delivered work on Monad.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.className} bg-black text-white antialiased selection:bg-orange-500 selection:text-white`}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  )
}
