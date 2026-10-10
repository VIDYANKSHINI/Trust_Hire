import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TrustHire with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "MON"
  );

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

  const TrustHireFactory = await ethers.getContractFactory("TrustHire");
  const trustHire = await TrustHireFactory.deploy(
    reviewer,
    arbitrator,
    feeRecipient,
    feeBps,
    confidenceThreshold,
    highConfidenceBps,
    shortWindow,
    longWindow,
    verdictTimeout
  );
  await trustHire.waitForDeployment();

  const contractAddress = await trustHire.getAddress();
  const deploymentTx = trustHire.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;

  console.log("TrustHire deployed to:", contractAddress);
  console.log("Deployment tx hash:", deploymentTx?.hash);

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
