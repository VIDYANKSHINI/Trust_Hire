import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { TrustHire } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TrustHire", function () {
  let trustHire: TrustHire;
  let deployer: HardhatEthersSigner;
  let client: HardhatEthersSigner;
  let freelancer: HardhatEthersSigner;
  let reviewer: HardhatEthersSigner;
  let arbitrator: HardhatEthersSigner;
  let feeRecipient: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const feeBps = 200; // 2%
  const confidenceThreshold = 7500; // 75%
  const highConfidenceBps = 9500; // 95%
  const shortWindow = 30; // 30s
  const longWindow = 90; // 90s
  const verdictTimeout = 300; // 300s

  const briefHash = ethers.keccak256(ethers.toUtf8Bytes("Test Brief Content"));
  const deliverableHash = ethers.keccak256(ethers.toUtf8Bytes("Test Deliverable"));
  const amount = ethers.parseEther("1.0");

  async function deployFixture() {
    [deployer, client, freelancer, reviewer, arbitrator, feeRecipient, other] =
      await ethers.getSigners();

    const TrustHireFactory = await ethers.getContractFactory("TrustHire");
    const contract = (await TrustHireFactory.deploy(
      reviewer.address,
      arbitrator.address,
      feeRecipient.address,
      feeBps,
      confidenceThreshold,
      highConfidenceBps,
      shortWindow,
      longWindow,
      verdictTimeout
    )) as TrustHire;
    await contract.waitForDeployment();
    return contract;
  }

  beforeEach(async function () {
    trustHire = await deployFixture();
  });

  it("1. createJob stores fields and locks msg.value; reverts on zero value, empty title, zero briefHash, past deadline", async function () {
    const latest = await time.latest();
    const deadline = latest + 3600;

    await expect(
      trustHire.connect(client).createJob("Web App", briefHash, deadline, {
        value: 0,
      })
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    await expect(
      trustHire.connect(client).createJob("", briefHash, deadline, {
        value: amount,
      })
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    await expect(
      trustHire.connect(client).createJob("Web App", ethers.ZeroHash, deadline, {
        value: amount,
      })
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    await expect(
      trustHire.connect(client).createJob("Web App", briefHash, latest - 10, {
        value: amount,
      })
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    const tx = await trustHire
      .connect(client)
      .createJob("Web App", briefHash, deadline, { value: amount });
    await expect(tx)
      .to.emit(trustHire, "JobCreated")
      .withArgs(1, client.address, amount, deadline, "Web App", briefHash);

    const job = await trustHire.getJob(1);
    expect(job.client).to.equal(client.address);
    expect(job.freelancer).to.equal(ethers.ZeroAddress);
    expect(job.amount).to.equal(amount);
    expect(job.deadline).to.equal(deadline);
    expect(job.state).to.equal(0); // Funded
    expect(job.title).to.equal("Web App");
    expect(job.briefHash).to.equal(briefHash);
    expect(await ethers.provider.getBalance(await trustHire.getAddress())).to.equal(
      amount
    );
  });

  it("2. assignFreelancer: only client, only in Funded, rejects zero address and client address; reassign allowed", async function () {
    const latest = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 3600, { value: amount });

    await expect(
      trustHire.connect(other).assignFreelancer(1, freelancer.address)
    ).to.be.revertedWithCustomError(trustHire, "NotClient");

    await expect(
      trustHire.connect(client).assignFreelancer(1, ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    await expect(
      trustHire.connect(client).assignFreelancer(1, client.address)
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    await expect(trustHire.connect(client).assignFreelancer(1, freelancer.address))
      .to.emit(trustHire, "JobAssigned")
      .withArgs(1, freelancer.address);

    let job = await trustHire.getJob(1);
    expect(job.designated).to.equal(freelancer.address);

    // Reassign allowed
    await trustHire.connect(client).assignFreelancer(1, other.address);
    job = await trustHire.getJob(1);
    expect(job.designated).to.equal(other.address);
  });

  it("3. acceptJob: designated enforcement (other address reverts NotDesignated); client cannot accept; works for anyone when none designated; reverts after deadline", async function () {
    const latest = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 100, { value: amount });

    // Client cannot accept
    await expect(
      trustHire.connect(client).acceptJob(1)
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    // Assign freelancer
    await trustHire.connect(client).assignFreelancer(1, freelancer.address);

    // Other cannot accept
    await expect(
      trustHire.connect(other).acceptJob(1)
    ).to.be.revertedWithCustomError(trustHire, "NotDesignated");

    // Freelancer can accept
    await expect(trustHire.connect(freelancer).acceptJob(1))
      .to.emit(trustHire, "JobAccepted")
      .withArgs(1, freelancer.address);

    let job = await trustHire.getJob(1);
    expect(job.state).to.equal(1); // Accepted
    expect(job.freelancer).to.equal(freelancer.address);

    // Job 2: without designated, anyone non-client can accept
    const now2 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 2", briefHash, now2 + 50, { value: amount });
    await trustHire.connect(other).acceptJob(2);
    job = await trustHire.getJob(2);
    expect(job.freelancer).to.equal(other.address);

    // Job 3: deadline passed reverts
    const now3 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 3", briefHash, now3 + 20, { value: amount });
    await time.increase(25);
    await expect(
      trustHire.connect(freelancer).acceptJob(3)
    ).to.be.revertedWithCustomError(trustHire, "DeadlinePassed");
  });

  it("4. cancelJob: refunds client, state Cancelled; reverts for non-client and for non-Funded", async function () {
    const latest = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 3600, { value: amount });

    await expect(
      trustHire.connect(other).cancelJob(1)
    ).to.be.revertedWithCustomError(trustHire, "NotClient");

    const clientBefore = await ethers.provider.getBalance(client.address);
    const tx = await trustHire.connect(client).cancelJob(1);
    const receipt = await tx.wait();
    const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
    const clientAfter = await ethers.provider.getBalance(client.address);

    expect(clientAfter + gasUsed - clientBefore).to.equal(amount);

    const job = await trustHire.getJob(1);
    expect(job.state).to.equal(6); // Cancelled

    // Revert for non-Funded (already cancelled)
    await expect(
      trustHire.connect(client).cancelJob(1)
    ).to.be.revertedWithCustomError(trustHire, "WrongState");
  });

  it("5. abandonJob: refunds client, state Refunded, freelancer.abandoned == 1; reverts for non-freelancer", async function () {
    const latest = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(1);

    await expect(
      trustHire.connect(other).abandonJob(1)
    ).to.be.revertedWithCustomError(trustHire, "NotFreelancer");

    const clientBefore = await ethers.provider.getBalance(client.address);
    await trustHire.connect(freelancer).abandonJob(1);
    const clientAfter = await ethers.provider.getBalance(client.address);

    expect(clientAfter - clientBefore).to.equal(amount);

    const job = await trustHire.getJob(1);
    expect(job.state).to.equal(5); // Refunded

    const flStats = await trustHire.stats(freelancer.address);
    expect(flStats.abandoned).to.equal(1);
  });

  it("6. claimRefund: reverts before deadline (DeadlineNotPassed); after deadline refunds, abandoned == 1; reverts if state Submitted", async function () {
    const latest = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 100, { value: amount });
    await trustHire.connect(freelancer).acceptJob(1);

    await expect(
      trustHire.connect(client).claimRefund(1)
    ).to.be.revertedWithCustomError(trustHire, "DeadlineNotPassed");

    await time.increase(105);

    const clientBefore = await ethers.provider.getBalance(client.address);
    const tx = await trustHire.connect(client).claimRefund(1);
    const receipt = await tx.wait();
    const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
    const clientAfter = await ethers.provider.getBalance(client.address);

    expect(clientAfter + gasUsed - clientBefore).to.equal(amount);

    const job = await trustHire.getJob(1);
    expect(job.state).to.equal(5); // Refunded
    const flStats = await trustHire.stats(freelancer.address);
    expect(flStats.abandoned).to.equal(1);

    // Job 2: reverts if state Submitted
    const now2 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 2", briefHash, now2 + 100, { value: amount });
    await trustHire.connect(freelancer).acceptJob(2);
    await trustHire.connect(freelancer).submitWork(2, deliverableHash);

    await time.increase(105);
    await expect(
      trustHire.connect(client).claimRefund(2)
    ).to.be.revertedWithCustomError(trustHire, "WrongState");
  });

  it("7. submitWork: only freelancer; reverts after deadline; reverts for zero hash", async function () {
    const latest = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 100, { value: amount });
    await trustHire.connect(freelancer).acceptJob(1);

    await expect(
      trustHire.connect(other).submitWork(1, deliverableHash)
    ).to.be.revertedWithCustomError(trustHire, "NotFreelancer");

    await expect(
      trustHire.connect(freelancer).submitWork(1, ethers.ZeroHash)
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    await expect(trustHire.connect(freelancer).submitWork(1, deliverableHash))
      .to.emit(trustHire, "WorkSubmitted")
      .withArgs(1, deliverableHash);

    const job = await trustHire.getJob(1);
    expect(job.state).to.equal(2); // Submitted
    expect(job.deliverableHash).to.equal(deliverableHash);
    expect(job.submittedAt).to.be.gt(0);

    // Reverts after deadline
    const now2 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 2", briefHash, now2 + 50, { value: amount });
    await trustHire.connect(freelancer).acceptJob(2);
    await time.increase(55);

    await expect(
      trustHire.connect(freelancer).submitWork(2, deliverableHash)
    ).to.be.revertedWithCustomError(trustHire, "DeadlinePassed");
  });

  it("8. submitVerdict: only reviewer; pass with confidence 9700 → ClientReview with window 30; pass with 8200 → window 90; pass with 7000 (below threshold) → Disputed; pass=false → Disputed; confidence > 10000 reverts", async function () {
    const latest = await time.latest();
    // Job 1: 9700 -> shortWindow (30s)
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(1);
    await trustHire.connect(freelancer).submitWork(1, deliverableHash);

    await expect(
      trustHire.connect(other).submitVerdict(1, true, 9700, "jev")
    ).to.be.revertedWithCustomError(trustHire, "NotReviewer");

    await expect(
      trustHire.connect(reviewer).submitVerdict(1, true, 10001, "jev")
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    await trustHire.connect(reviewer).submitVerdict(1, true, 9700, "jev");
    let job1 = await trustHire.getJob(1);
    expect(job1.state).to.equal(3); // ClientReview
    const now1 = await time.latest();
    expect(job1.reviewDeadline).to.equal(now1 + shortWindow);

    // Job 2: 8200 -> longWindow (90s)
    const now2 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 2", briefHash, now2 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(2);
    await trustHire.connect(freelancer).submitWork(2, deliverableHash);

    await trustHire.connect(reviewer).submitVerdict(2, true, 8200, "llm");
    let job2 = await trustHire.getJob(2);
    expect(job2.state).to.equal(3); // ClientReview
    const now2After = await time.latest();
    expect(job2.reviewDeadline).to.equal(now2After + longWindow);

    // Job 3: 7000 (< 7500 threshold) -> Disputed
    const now3 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 3", briefHash, now3 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(3);
    await trustHire.connect(freelancer).submitWork(3, deliverableHash);

    await trustHire.connect(reviewer).submitVerdict(3, true, 7000, "jev");
    let job3 = await trustHire.getJob(3);
    expect(job3.state).to.equal(7); // Disputed

    // Job 4: pass = false -> Disputed
    const now4 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 4", briefHash, now4 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(4);
    await trustHire.connect(freelancer).submitWork(4, deliverableHash);

    await trustHire.connect(reviewer).submitVerdict(4, false, 9900, "jev");
    let job4 = await trustHire.getJob(4);
    expect(job4.state).to.equal(7); // Disputed
  });

  it("9. approveWork: client only; pays amount - 2% to freelancer and 2% to feeRecipient; completed == 1; state Released; second call reverts WrongState", async function () {
    const latest = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(1);
    await trustHire.connect(freelancer).submitWork(1, deliverableHash);
    await trustHire.connect(reviewer).submitVerdict(1, true, 9700, "jev");

    await expect(
      trustHire.connect(other).approveWork(1)
    ).to.be.revertedWithCustomError(trustHire, "NotClient");

    const flBefore = await ethers.provider.getBalance(freelancer.address);
    const feeBefore = await ethers.provider.getBalance(feeRecipient.address);

    const expectedFee = (amount * BigInt(feeBps)) / 10000n;
    const expectedPayout = amount - expectedFee;

    await expect(trustHire.connect(client).approveWork(1))
      .to.emit(trustHire, "Released")
      .withArgs(1, freelancer.address, expectedPayout, expectedFee, 0);

    const flAfter = await ethers.provider.getBalance(freelancer.address);
    const feeAfter = await ethers.provider.getBalance(feeRecipient.address);

    expect(flAfter - flBefore).to.equal(expectedPayout);
    expect(feeAfter - feeBefore).to.equal(expectedFee);

    const job = await trustHire.getJob(1);
    expect(job.state).to.equal(4); // Released
    const flStats = await trustHire.stats(freelancer.address);
    expect(flStats.completed).to.equal(1);

    // Second call reverts WrongState
    await expect(
      trustHire.connect(client).approveWork(1)
    ).to.be.revertedWithCustomError(trustHire, "WrongState");
  });

  it("10. autoRelease: reverts before reviewDeadline (WindowNotExpired); callable by a random address after; pays freelancer; client.ghosted == 1; freelancer.completed == 1", async function () {
    const latest = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(1);
    await trustHire.connect(freelancer).submitWork(1, deliverableHash);
    await trustHire.connect(reviewer).submitVerdict(1, true, 9700, "jev"); // shortWindow = 30s

    await expect(
      trustHire.connect(other).autoRelease(1)
    ).to.be.revertedWithCustomError(trustHire, "WindowNotExpired");

    await time.increase(35);

    const flBefore = await ethers.provider.getBalance(freelancer.address);
    const feeBefore = await ethers.provider.getBalance(feeRecipient.address);

    const expectedFee = (amount * BigInt(feeBps)) / 10000n;
    const expectedPayout = amount - expectedFee;

    await expect(trustHire.connect(other).autoRelease(1))
      .to.emit(trustHire, "Released")
      .withArgs(1, freelancer.address, expectedPayout, expectedFee, 1);

    const flAfter = await ethers.provider.getBalance(freelancer.address);
    const feeAfter = await ethers.provider.getBalance(feeRecipient.address);

    expect(flAfter - flBefore).to.equal(expectedPayout);
    expect(feeAfter - feeBefore).to.equal(expectedFee);

    const job = await trustHire.getJob(1);
    expect(job.state).to.equal(4); // Released

    const clientStats = await trustHire.stats(client.address);
    expect(clientStats.ghosted).to.equal(1);

    const flStats = await trustHire.stats(freelancer.address);
    expect(flStats.completed).to.equal(1);
  });

  it("11. raiseDispute: client within window → Disputed and both disputed ++; client after window reverts; freelancer in Submitted before verdictTimeout reverts; freelancer in Submitted after verdictTimeout → Disputed", async function () {
    const latest = await time.latest();
    // Job 1: client within review window
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(1);
    await trustHire.connect(freelancer).submitWork(1, deliverableHash);
    await trustHire.connect(reviewer).submitVerdict(1, true, 9700, "jev");

    await trustHire.connect(client).raiseDispute(1);
    let job1 = await trustHire.getJob(1);
    expect(job1.state).to.equal(7); // Disputed
    let clStats = await trustHire.stats(client.address);
    let flStats = await trustHire.stats(freelancer.address);
    expect(clStats.disputed).to.equal(1);
    expect(flStats.disputed).to.equal(1);

    // Job 2: client after window reverts
    const now2 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 2", briefHash, now2 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(2);
    await trustHire.connect(freelancer).submitWork(2, deliverableHash);
    await trustHire.connect(reviewer).submitVerdict(2, true, 9700, "jev");
    await time.increase(35); // window expired

    await expect(
      trustHire.connect(client).raiseDispute(2)
    ).to.be.revertedWithCustomError(trustHire, "WindowExpired");

    // Job 3: freelancer in Submitted before verdictTimeout reverts; after verdictTimeout -> Disputed
    const now3 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 3", briefHash, now3 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(3);
    await trustHire.connect(freelancer).submitWork(3, deliverableHash);

    // Before verdictTimeout (300s)
    await expect(
      trustHire.connect(freelancer).raiseDispute(3)
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    // After verdictTimeout
    await time.increase(305);
    await trustHire.connect(freelancer).raiseDispute(3);
    let job3 = await trustHire.getJob(3);
    expect(job3.state).to.equal(7); // Disputed
  });

  it("12. resolveDispute: arbitrator only; split 70/30 pays freelancer 70% - 2% of that part, client 30%, fee correct, balances sum to amount; share 10000 and 0 work; share 10001 reverts", async function () {
    const latest = await time.latest();
    // Job 1: 70/30 split
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, latest + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(1);
    await trustHire.connect(freelancer).submitWork(1, deliverableHash);
    await trustHire.connect(reviewer).submitVerdict(1, false, 0, "error"); // Disputed

    await expect(
      trustHire.connect(other).resolveDispute(1, 7000)
    ).to.be.revertedWithCustomError(trustHire, "NotArbitrator");

    await expect(
      trustHire.connect(arbitrator).resolveDispute(1, 10001)
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    const flBefore = await ethers.provider.getBalance(freelancer.address);
    const clBefore = await ethers.provider.getBalance(client.address);
    const feeBefore = await ethers.provider.getBalance(feeRecipient.address);

    const shareBps = 7000n; // 70%
    const flGross = (amount * shareBps) / 10000n;
    const fee = (flGross * BigInt(feeBps)) / 10000n;
    const flNet = flGross - fee;
    const clNet = amount - flGross;

    expect(flNet + clNet + fee).to.equal(amount);

    await expect(trustHire.connect(arbitrator).resolveDispute(1, 7000))
      .to.emit(trustHire, "DisputeResolved")
      .withArgs(1, 7000, flNet, clNet, fee);

    const flAfter = await ethers.provider.getBalance(freelancer.address);
    const clAfter = await ethers.provider.getBalance(client.address);
    const feeAfter = await ethers.provider.getBalance(feeRecipient.address);

    expect(flAfter - flBefore).to.equal(flNet);
    expect(clAfter - clBefore).to.equal(clNet);
    expect(feeAfter - feeBefore).to.equal(fee);

    const job = await trustHire.getJob(1);
    expect(job.state).to.equal(8); // Resolved

    // Job 2: 100% share to freelancer
    const now2 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 2", briefHash, now2 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(2);
    await trustHire.connect(freelancer).submitWork(2, deliverableHash);
    await trustHire.connect(reviewer).submitVerdict(2, false, 0, "error");

    await trustHire.connect(arbitrator).resolveDispute(2, 10000);
    const job2 = await trustHire.getJob(2);
    expect(job2.state).to.equal(8);

    // Job 3: 0% share (full refund to client)
    const now3 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 3", briefHash, now3 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(3);
    await trustHire.connect(freelancer).submitWork(3, deliverableHash);
    await trustHire.connect(reviewer).submitVerdict(3, false, 0, "error");

    await trustHire.connect(arbitrator).resolveDispute(3, 0);
    const job3 = await trustHire.getJob(3);
    expect(job3.state).to.equal(8);
  });

  it("13. Contract balance is 0 after every terminal path (Released, Refunded, Cancelled, Resolved)", async function () {
    const contractAddr = await trustHire.getAddress();

    // 1. Released path
    const now1 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 1", briefHash, now1 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(1);
    await trustHire.connect(freelancer).submitWork(1, deliverableHash);
    await trustHire.connect(reviewer).submitVerdict(1, true, 9700, "jev");
    await trustHire.connect(client).approveWork(1);
    expect(await ethers.provider.getBalance(contractAddr)).to.equal(0);

    // 2. Refunded path (abandon)
    const now2 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 2", briefHash, now2 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(2);
    await trustHire.connect(freelancer).abandonJob(2);
    expect(await ethers.provider.getBalance(contractAddr)).to.equal(0);

    // 3. Cancelled path
    const now3 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 3", briefHash, now3 + 3600, { value: amount });
    await trustHire.connect(client).cancelJob(3);
    expect(await ethers.provider.getBalance(contractAddr)).to.equal(0);

    // 4. Resolved path
    const now4 = await time.latest();
    await trustHire
      .connect(client)
      .createJob("Job 4", briefHash, now4 + 3600, { value: amount });
    await trustHire.connect(freelancer).acceptJob(4);
    await trustHire.connect(freelancer).submitWork(4, deliverableHash);
    await trustHire.connect(reviewer).submitVerdict(4, false, 0, "error");
    await trustHire.connect(arbitrator).resolveDispute(4, 5000);
    expect(await ethers.provider.getBalance(contractAddr)).to.equal(0);
  });

  it("14. Constructor validation reverts for bad config (fee > 1000, threshold > high, zero address)", async function () {
    const Factory = await ethers.getContractFactory("TrustHire");

    // feeBps > 1000
    await expect(
      Factory.deploy(
        reviewer.address,
        arbitrator.address,
        feeRecipient.address,
        1001,
        confidenceThreshold,
        highConfidenceBps,
        shortWindow,
        longWindow,
        verdictTimeout
      )
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    // threshold > high
    await expect(
      Factory.deploy(
        reviewer.address,
        arbitrator.address,
        feeRecipient.address,
        feeBps,
        9600,
        9500,
        shortWindow,
        longWindow,
        verdictTimeout
      )
    ).to.be.revertedWithCustomError(trustHire, "BadParams");

    // zero address
    await expect(
      Factory.deploy(
        ethers.ZeroAddress,
        arbitrator.address,
        feeRecipient.address,
        feeBps,
        confidenceThreshold,
        highConfidenceBps,
        shortWindow,
        longWindow,
        verdictTimeout
      )
    ).to.be.revertedWithCustomError(trustHire, "BadParams");
  });
});
