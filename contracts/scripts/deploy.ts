import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const rpcUrl = process.env.RPC_URL || "https://rpc.ankr.com/monad_testnet";
  const req = new ethers.FetchRequest(rpcUrl);
  req.timeout = 60000;
  const provider = new ethers.JsonRpcProvider(req, 10143, { staticNetwork: true });

  const rawPk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!rawPk) throw new Error("Missing DEPLOYER_PRIVATE_KEY in environment");
  const pk = rawPk.startsWith("0x") ? rawPk : `0x${rawPk}`;
  const deployer = new ethers.Wallet(pk, provider);

  console.log("Deploying TrustHire with account:", deployer.address);
  const balance = await provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MON");

  const reviewer = process.env.REVIEWER_ADDRESS;
  const arbitrator = process.env.ARBITRATOR_ADDRESS || deployer.address;
  const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS || deployer.address;

  if (!reviewer) {
    throw new Error("Missing REVIEWER_ADDRESS in environment");
  }

  const feeBps = 200;
  const confidenceThreshold = 7500;
  const highConfidenceBps = 9500;
  const shortWindow = 30;
  const longWindow = 90;
  const verdictTimeout = 300;

  const args = [
    reviewer,
    arbitrator,
    feeRecipient,
    feeBps,
    confidenceThreshold,
    highConfidenceBps,
    shortWindow,
    longWindow,
    verdictTimeout,
  ];

  console.log("Constructor args:", args);

  // Load compiled artifact
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/TrustHire.sol/TrustHire.json"
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error("Artifact not found: " + artifactPath);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const TrustHireFactory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    deployer
  );

  console.log("Broadcasting deployment transaction to Monad Testnet...");
  const trustHire = await TrustHireFactory.deploy(
    reviewer,
    arbitrator,
    feeRecipient,
    feeBps,
    confidenceThreshold,
    highConfidenceBps,
    shortWindow,
    longWindow,
    verdictTimeout,
    { gasLimit: 2500000 }
  );
  console.log("Transaction sent! Waiting for deployment confirmation...");
  await trustHire.waitForDeployment();

  const contractAddress = await trustHire.getAddress();
  const deploymentTx = trustHire.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;

  console.log("==========================================");
  console.log("TrustHire successfully deployed to:", contractAddress);
  console.log("Deployment tx hash:", deploymentTx?.hash);
  console.log("Block number:", receipt?.blockNumber);
  console.log("==========================================");

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentData = {
    address: contractAddress,
    deployer: deployer.address,
    txHash: deploymentTx?.hash,
    blockNumber: receipt?.blockNumber,
    args: args,
  };

  const deploymentFile = path.join(deploymentsDir, "monadTestnet.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2), "utf8");
  console.log("Deployment record saved to:", deploymentFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
