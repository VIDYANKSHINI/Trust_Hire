import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.seed" });
dotenv.config();

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

async function signIn(wallet: any): Promise<string> {
  const nonceRes = await fetch(`${API_BASE}/api/auth/nonce?address=${wallet.address}`);
  if (!nonceRes.ok) throw new Error("Failed to get nonce for " + wallet.address);
  const { message } = await nonceRes.json();

  const signature = await wallet.signMessage(message);

  const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: wallet.address, signature }),
  });
  if (!verifyRes.ok) throw new Error("Failed to verify signature for " + wallet.address);
  const { token } = await verifyRes.json();
  return token;
}

async function main() {
  const args = process.argv.slice(2);
  const isApplicants = args.includes("--applicants");
  const isGhost = args.includes("--ghost");
  const isRefund = args.includes("--refund");
  const isDispute = args.includes("--dispute");

  const [deployer] = await ethers.getSigners();
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  }

  const TrustHireFactory = await ethers.getContractFactory("TrustHire");
  const trustHire = TrustHireFactory.attach(contractAddress) as any;

  // Set up wallets
  const clientWallet = process.env.CLIENT_PK
    ? new ethers.Wallet(process.env.CLIENT_PK, ethers.provider)
    : deployer;

  const freelancerWallet = process.env.FREELANCER_PK
    ? new ethers.Wallet(process.env.FREELANCER_PK, ethers.provider)
    : deployer;

  const app2Wallet = process.env.APPLICANT2_PK
    ? new ethers.Wallet(process.env.APPLICANT2_PK, ethers.provider)
    : deployer;

  const app3Wallet = process.env.APPLICANT3_PK
    ? new ethers.Wallet(process.env.APPLICANT3_PK, ethers.provider)
    : deployer;

  const deposit = ethers.parseEther("0.01");

  if (isApplicants) {
    console.log("Seeding --applicants job...");
    const clientToken = await signIn(clientWallet);
    const deadline = Math.floor(Date.now() / 1000) + 7200; // +2 hours

    const briefObj = {
      description: "Build an automated arbitrage bot for Monad DEXes with fast execution and safety checks.",
      criteria: [
        "Monitors liquidity pools on testnet",
        "Executes atomic multi-hop arbitrage trades",
        "Implements slippage protection and simulation checks"
      ],
    };
    const briefString = JSON.stringify(briefObj);
    const briefHash = ethers.keccak256(ethers.toUtf8Bytes(briefString));

    const tx = await trustHire.connect(clientWallet).createJob(
      "Monad DEX Arbitrage Bot",
      briefHash,
      deadline,
      { value: deposit }
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((l: any) => l.fragment?.name === "JobCreated");
    const jobId = Number(event?.args?.[0] || (await trustHire.jobCount()));

    // Save brief
    await fetch(`${API_BASE}/api/brief/${jobId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        brief: briefString,
        publicSummary: "Looking for an expert DeFi developer to build an atomic arbitrage bot on Monad testnet.",
      }),
    });

    // Applicant 2 (Strong pitch)
    const token2 = await signIn(app2Wallet);
    await fetch(`${API_BASE}/api/applications/${jobId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({
        pitch: "I have built 4 production MEV bots on EVM chains and understand Monad's parallel execution model thoroughly.",
        skills: ["Solidity", "Rust", "Arbitrage", "EVM", "MEV"],
      }),
    });

    // Applicant 3 (Weak pitch)
    const token3 = await signIn(app3Wallet);
    await fetch(`${API_BASE}/api/applications/${jobId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token3}`,
      },
      body: JSON.stringify({
        pitch: "I am a web designer who is interested in learning more about crypto bots.",
        skills: ["Figma", "HTML", "CSS"],
      }),
    });

    console.log(`[OK] Created job for --applicants: ID=${jobId}`);
  }

  if (isGhost) {
    console.log("Seeding --ghost job...");
    const clientToken = await signIn(clientWallet);
    const freelancerToken = await signIn(freelancerWallet);

    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const briefObj = {
      description: "Design and implement smart contract security audit report template.",
      criteria: ["Check reentrancy", "Check access control", "Severity matrix table"],
    };
    const briefString = JSON.stringify(briefObj);
    const briefHash = ethers.keccak256(ethers.toUtf8Bytes(briefString));

    const tx = await trustHire.connect(clientWallet).createJob(
      "Audit Template",
      briefHash,
      deadline,
      { value: deposit }
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((l: any) => l.fragment?.name === "JobCreated");
    const jobId = Number(event?.args?.[0] || (await trustHire.jobCount()));

    await fetch(`${API_BASE}/api/brief/${jobId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        brief: briefString,
        publicSummary: "Security audit checklist template.",
      }),
    });

    // Accept job
    await (await trustHire.connect(freelancerWallet).acceptJob(jobId)).wait();

    // Deliverable
    const deliverableContent = "Comprehensive audit report template containing reentrancy checks, access control rules, and severity matrix.";
    const putDelRes = await fetch(`${API_BASE}/api/deliverable/${jobId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freelancerToken}`,
      },
      body: JSON.stringify({ content: deliverableContent }),
    });
    const { hash: delHash } = await putDelRes.json();

    // Submit work on chain
    await (await trustHire.connect(freelancerWallet).submitWork(jobId, delHash)).wait();

    // Review work
    const revRes = await fetch(`${API_BASE}/api/review/${jobId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${freelancerToken}` },
    });
    const revData = await revRes.json();

    const job = await trustHire.getJob(jobId);
    console.log(`[OK] Created job for --ghost: ID=${jobId}, reviewDeadline=${job.reviewDeadline}`);
  }

  if (isRefund) {
    console.log("Seeding --refund job...");
    const clientToken = await signIn(clientWallet);
    const deadlineMins = 6;
    const deadline = Math.floor(Date.now() / 1000) + deadlineMins * 60;

    const briefObj = {
      description: "Quick script for monitoring gas price.",
      criteria: ["Logs gas price every 10s"],
    };
    const briefString = JSON.stringify(briefObj);
    const briefHash = ethers.keccak256(ethers.toUtf8Bytes(briefString));

    const tx = await trustHire.connect(clientWallet).createJob(
      "Gas Monitor Script",
      briefHash,
      deadline,
      { value: deposit }
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((l: any) => l.fragment?.name === "JobCreated");
    const jobId = Number(event?.args?.[0] || (await trustHire.jobCount()));

    await fetch(`${API_BASE}/api/brief/${jobId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        brief: briefString,
        publicSummary: "Quick gas monitor script task.",
      }),
    });

    await (await trustHire.connect(freelancerWallet).acceptJob(jobId)).wait();
    console.log(`[OK] Created job for --refund: ID=${jobId}, deadline in ${deadlineMins} minutes`);
  }

  if (isDispute) {
    console.log("Seeding --dispute job...");
    const clientToken = await signIn(clientWallet);
    const freelancerToken = await signIn(freelancerWallet);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    const briefObj = {
      description: "Complex backend integration for payment rails.",
      criteria: ["Stripe webhook handler", "Signature verification", "Idempotency key storage"],
    };
    const briefString = JSON.stringify(briefObj);
    const briefHash = ethers.keccak256(ethers.toUtf8Bytes(briefString));

    const tx = await trustHire.connect(clientWallet).createJob(
      "Payment Rails Backend",
      briefHash,
      deadline,
      { value: deposit }
    );
    const receipt = await tx.wait();
    const event = receipt.logs.find((l: any) => l.fragment?.name === "JobCreated");
    const jobId = Number(event?.args?.[0] || (await trustHire.jobCount()));

    await fetch(`${API_BASE}/api/brief/${jobId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        brief: briefString,
        publicSummary: "Payment rails integration.",
      }),
    });

    await (await trustHire.connect(freelancerWallet).acceptJob(jobId)).wait();

    // Empty placeholder deliverable deliberately designed to fail review
    const emptyDeliverable = "lorem ipsum placeholder text";
    const putRes = await fetch(`${API_BASE}/api/deliverable/${jobId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freelancerToken}`,
      },
      body: JSON.stringify({ content: emptyDeliverable }),
    });
    const { hash: delHash } = await putRes.json();

    await (await trustHire.connect(freelancerWallet).submitWork(jobId, delHash)).wait();
    await fetch(`${API_BASE}/api/review/${jobId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${freelancerToken}` },
    });

    console.log(`[OK] Created job for --dispute: ID=${jobId}`);
  }
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exitCode = 1;
});
