import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { trustHireAbi } from "../abi";
import { CONTRACT_ADDRESS, RPC_URL, CHAIN_ID } from "../config";
import { Job, Stats, Address } from "../types";

export const monadTestnetChain = defineChain({
  id: CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL || RPC_URL || "https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "MonadExplorer", url: "https://testnet.monadexplorer.com" },
  },
});

export function getPublicClient() {
  const rpc = process.env.RPC_URL || RPC_URL || "https://testnet-rpc.monad.xyz";
  return createPublicClient({
    chain: monadTestnetChain,
    transport: http(rpc),
  });
}

export function getReviewerWalletClient() {
  const key = process.env.REVIEWER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key) {
    throw new Error("Missing REVIEWER_PRIVATE_KEY in environment");
  }
  const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
  const rpc = process.env.RPC_URL || RPC_URL || "https://testnet-rpc.monad.xyz";

  return {
    account,
    client: createWalletClient({
      account,
      chain: monadTestnetChain,
      transport: http(rpc),
    }),
  };
}

export async function getJobOnChain(jobId: number): Promise<Job> {
  const publicClient = getPublicClient();
  const address = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || CONTRACT_ADDRESS) as `0x${string}`;

  if (!address || address === "0x") {
    throw new Error("Contract address not configured yet");
  }

  const raw = await publicClient.readContract({
    address,
    abi: trustHireAbi,
    functionName: "getJob",
    args: [BigInt(jobId)],
  });

  return {
    client: raw.client.toLowerCase() as Address,
    freelancer: raw.freelancer.toLowerCase() as Address,
    designated: raw.designated.toLowerCase() as Address,
    amount: raw.amount,
    deadline: raw.deadline,
    submittedAt: raw.submittedAt,
    reviewDeadline: raw.reviewDeadline,
    confidenceBps: Number(raw.confidenceBps),
    state: Number(raw.state),
    briefHash: raw.briefHash,
    deliverableHash: raw.deliverableHash,
    title: raw.title,
  };
}

export async function getStatsOnChain(addr: Address): Promise<Stats> {
  const publicClient = getPublicClient();
  const address = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || CONTRACT_ADDRESS) as `0x${string}`;

  if (!address || address === "0x") {
    return { completed: 0, ghosted: 0, abandoned: 0, disputed: 0 };
  }

  try {
    const raw = await publicClient.readContract({
      address,
      abi: trustHireAbi,
      functionName: "stats",
      args: [addr],
    });

    return {
      completed: Number(raw[0]),
      ghosted: Number(raw[1]),
      abandoned: Number(raw[2]),
      disputed: Number(raw[3]),
    };
  } catch (e) {
    return { completed: 0, ghosted: 0, abandoned: 0, disputed: 0 };
  }
}

export async function submitVerdictOnChain(
  jobId: number,
  pass: boolean,
  confidenceBps: number,
  provider: string
): Promise<`0x${string}`> {
  const { account, client } = getReviewerWalletClient();
  const publicClient = getPublicClient();
  const address = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || CONTRACT_ADDRESS) as `0x${string}`;

  const hash = await client.writeContract({
    address,
    abi: trustHireAbi,
    functionName: "submitVerdict",
    args: [BigInt(jobId), pass, confidenceBps, provider],
    account,
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
