import { http, createConfig, injected } from "wagmi"
import { defineChain } from "viem"
import { CHAIN_ID, RPC_URL, EXPLORER_URL, NATIVE_SYMBOL } from "./config"

export const monadTestnet = defineChain({
  id: CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: NATIVE_SYMBOL,
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: EXPLORER_URL },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [injected()],
  ssr: true,
  transports: {
    [monadTestnet.id]: http(),
  },
})
