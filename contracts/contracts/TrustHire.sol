// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TrustHire is ReentrancyGuard {
    enum JobState {
        Funded,
        Accepted,
        Submitted,
        ClientReview,
        Released,
        Refunded,
        Cancelled,
        Disputed,
        Resolved
    }

    struct Job {
        address client;
        address freelancer;
        address designated;
        uint256 amount;
        uint64 deadline;
        uint64 submittedAt;
        uint64 reviewDeadline;
        uint16 confidenceBps;
        JobState state;
        bytes32 briefHash;
        bytes32 deliverableHash;
        string title;
    }

    struct Stats {
        uint32 completed;
        uint32 ghosted;
        uint32 abandoned;
        uint32 disputed;
    }

    // Custom errors
    error NotClient();
    error NotFreelancer();
    error NotReviewer();
    error NotArbitrator();
    error NotDesignated();
    error WrongState();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error WindowNotExpired();
    error WindowExpired();
    error BadParams();
    error TransferFailed();

    // Immutables
    address public immutable reviewer;
    address public immutable arbitrator;
    address public immutable feeRecipient;
    uint16 public immutable feeBps;
    uint16 public immutable confidenceThreshold;
    uint16 public immutable highConfidenceBps;
    uint32 public immutable shortWindow;
    uint32 public immutable longWindow;
    uint32 public immutable verdictTimeout;

    // State
    uint256 public jobCount;
    mapping(uint256 => Job) private jobs;
    mapping(address => Stats) public stats;

    // Events
    event JobCreated(
        uint256 indexed id,
        address indexed client,
        uint256 amount,
        uint64 deadline,
        string title,
        bytes32 briefHash
    );
    event JobAssigned(uint256 indexed id, address indexed designated);
    event JobAccepted(uint256 indexed id, address indexed freelancer);
    event WorkSubmitted(uint256 indexed id, bytes32 deliverableHash);
    event VerdictRecorded(
        uint256 indexed id,
        string provider,
        bool pass,
        uint16 confidenceBps
    );
    event ReviewWindowOpened(uint256 indexed id, uint64 reviewDeadline);
    event Released(
        uint256 indexed id,
        address indexed freelancer,
        uint256 payout,
        uint256 fee,
        uint8 reason
    ); // 0 approved, 1 autoReleased
    event Refunded(
        uint256 indexed id,
        address indexed client,
        uint256 amount,
        uint8 reason
    ); // 0 cancelled, 1 abandoned, 2 deadlineMissed
    event DisputeRaised(uint256 indexed id, address by);
    event DisputeResolved(
        uint256 indexed id,
        uint16 freelancerShareBps,
        uint256 freelancerPayout,
        uint256 clientRefund,
        uint256 fee
    );

    constructor(
        address _reviewer,
        address _arbitrator,
        address _feeRecipient,
        uint16 _feeBps,
        uint16 _confidenceThreshold,
        uint16 _highConfidenceBps,
        uint32 _shortWindow,
        uint32 _longWindow,
        uint32 _verdictTimeout
    ) {
        if (_feeBps > 1000) revert BadParams();
        if (_confidenceThreshold > _highConfidenceBps || _highConfidenceBps > 10000) revert BadParams();
        if (_reviewer == address(0) || _arbitrator == address(0) || _feeRecipient == address(0)) revert BadParams();
        if (_shortWindow == 0 || _longWindow < _shortWindow || _verdictTimeout == 0) revert BadParams();

        reviewer = _reviewer;
        arbitrator = _arbitrator;
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
        confidenceThreshold = _confidenceThreshold;
        highConfidenceBps = _highConfidenceBps;
        shortWindow = _shortWindow;
        longWindow = _longWindow;
        verdictTimeout = _verdictTimeout;
    }

    function getJob(uint256 id) external view returns (Job memory) {
        if (id == 0 || id > jobCount) revert BadParams();
        return jobs[id];
    }

    function windowFor(uint16 confidenceBps) public view returns (uint32) {
        return confidenceBps >= highConfidenceBps ? shortWindow : longWindow;
    }

    function createJob(
        string calldata title,
        bytes32 briefHash,
        uint64 deadline
    ) external payable returns (uint256 id) {
        if (msg.value == 0) revert BadParams();
        bytes memory titleBytes = bytes(title);
        if (titleBytes.length == 0 || titleBytes.length > 80) revert BadParams();
        if (briefHash == bytes32(0)) revert BadParams();
        if (deadline <= block.timestamp) revert BadParams();

        id = ++jobCount;
        jobs[id] = Job({
            client: msg.sender,
            freelancer: address(0),
            designated: address(0),
            amount: msg.value,
            deadline: deadline,
            submittedAt: 0,
            reviewDeadline: 0,
            confidenceBps: 0,
            state: JobState.Funded,
            briefHash: briefHash,
            deliverableHash: bytes32(0),
            title: title
        });

        emit JobCreated(id, msg.sender, msg.value, deadline, title, briefHash);
    }

    function assignFreelancer(uint256 id, address f) external {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (msg.sender != job.client) revert NotClient();
        if (job.state != JobState.Funded) revert WrongState();
        if (f == address(0) || f == job.client) revert BadParams();

        job.designated = f;
        emit JobAssigned(id, f);
    }

    function acceptJob(uint256 id) external {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (job.state != JobState.Funded) revert WrongState();
        if (msg.sender == job.client) revert BadParams();
        if (block.timestamp >= job.deadline) revert DeadlinePassed();
        if (job.designated != address(0) && msg.sender != job.designated) revert NotDesignated();

        job.freelancer = msg.sender;
        job.state = JobState.Accepted;
        emit JobAccepted(id, msg.sender);
    }

    function cancelJob(uint256 id) external nonReentrant {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (msg.sender != job.client) revert NotClient();
        if (job.state != JobState.Funded) revert WrongState();

        uint256 amount = job.amount;
        job.state = JobState.Cancelled;
        emit Refunded(id, msg.sender, amount, 0);

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function abandonJob(uint256 id) external nonReentrant {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (msg.sender != job.freelancer) revert NotFreelancer();
        if (job.state != JobState.Accepted) revert WrongState();

        uint256 amount = job.amount;
        job.state = JobState.Refunded;
        stats[msg.sender].abandoned++;
        emit Refunded(id, job.client, amount, 1);

        (bool ok, ) = job.client.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function claimRefund(uint256 id) external nonReentrant {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (msg.sender != job.client) revert NotClient();
        if (job.state != JobState.Accepted) revert WrongState();
        if (block.timestamp <= job.deadline) revert DeadlineNotPassed();

        uint256 amount = job.amount;
        address freelancer = job.freelancer;
        job.state = JobState.Refunded;
        stats[freelancer].abandoned++;
        emit Refunded(id, msg.sender, amount, 2);

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function submitWork(uint256 id, bytes32 deliverableHash) external {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (msg.sender != job.freelancer) revert NotFreelancer();
        if (job.state != JobState.Accepted) revert WrongState();
        if (block.timestamp > job.deadline) revert DeadlinePassed();
        if (deliverableHash == bytes32(0)) revert BadParams();

        job.deliverableHash = deliverableHash;
        job.submittedAt = uint64(block.timestamp);
        job.state = JobState.Submitted;
        emit WorkSubmitted(id, deliverableHash);
    }

    function submitVerdict(
        uint256 id,
        bool pass,
        uint16 confidenceBps,
        string calldata provider
    ) external {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (msg.sender != reviewer) revert NotReviewer();
        if (job.state != JobState.Submitted) revert WrongState();
        if (confidenceBps > 10000) revert BadParams();

        job.confidenceBps = confidenceBps;
        emit VerdictRecorded(id, provider, pass, confidenceBps);

        if (pass && confidenceBps >= confidenceThreshold) {
            uint32 window = windowFor(confidenceBps);
            uint64 reviewDl = uint64(block.timestamp + window);
            job.reviewDeadline = reviewDl;
            job.state = JobState.ClientReview;
            emit ReviewWindowOpened(id, reviewDl);
        } else {
            job.state = JobState.Disputed;
            stats[job.client].disputed++;
            stats[job.freelancer].disputed++;
            emit DisputeRaised(id, address(this));
        }
    }

    function approveWork(uint256 id) external nonReentrant {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (msg.sender != job.client) revert NotClient();
        if (job.state != JobState.ClientReview) revert WrongState();

        job.state = JobState.Released;
        stats[job.freelancer].completed++;

        uint256 fee = (job.amount * feeBps) / 10000;
        uint256 payout = job.amount - fee;
        emit Released(id, job.freelancer, payout, fee, 0);

        if (fee > 0) {
            (bool feeOk, ) = feeRecipient.call{value: fee}("");
            if (!feeOk) revert TransferFailed();
        }
        (bool payOk, ) = job.freelancer.call{value: payout}("");
        if (!payOk) revert TransferFailed();
    }

    function autoRelease(uint256 id) external nonReentrant {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (job.state != JobState.ClientReview) revert WrongState();
        if (block.timestamp <= job.reviewDeadline) revert WindowNotExpired();

        job.state = JobState.Released;
        stats[job.client].ghosted++;
        stats[job.freelancer].completed++;

        uint256 fee = (job.amount * feeBps) / 10000;
        uint256 payout = job.amount - fee;
        emit Released(id, job.freelancer, payout, fee, 1);

        if (fee > 0) {
            (bool feeOk, ) = feeRecipient.call{value: fee}("");
            if (!feeOk) revert TransferFailed();
        }
        (bool payOk, ) = job.freelancer.call{value: payout}("");
        if (!payOk) revert TransferFailed();
    }

    function raiseDispute(uint256 id) external {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];

        if (job.state == JobState.ClientReview) {
            if (msg.sender != job.client) revert NotClient();
            if (block.timestamp > job.reviewDeadline) revert WindowExpired();
        } else if (job.state == JobState.Submitted) {
            if (msg.sender != job.client && msg.sender != job.freelancer) revert BadParams();
            if (block.timestamp <= job.submittedAt + verdictTimeout) revert BadParams();
        } else {
            revert WrongState();
        }

        job.state = JobState.Disputed;
        stats[job.client].disputed++;
        stats[job.freelancer].disputed++;
        emit DisputeRaised(id, msg.sender);
    }

    function resolveDispute(uint256 id, uint16 freelancerShareBps) external nonReentrant {
        if (id == 0 || id > jobCount) revert BadParams();
        Job storage job = jobs[id];
        if (msg.sender != arbitrator) revert NotArbitrator();
        if (job.state != JobState.Disputed) revert WrongState();
        if (freelancerShareBps > 10000) revert BadParams();

        job.state = JobState.Resolved;

        uint256 amount = job.amount;
        uint256 fl = (amount * freelancerShareBps) / 10000;
        uint256 fee = (fl * feeBps) / 10000;
        uint256 freelancerPayout = fl - fee;
        uint256 clientRefund = amount - fl;

        emit DisputeResolved(id, freelancerShareBps, freelancerPayout, clientRefund, fee);

        if (fee > 0) {
            (bool feeOk, ) = feeRecipient.call{value: fee}("");
            if (!feeOk) revert TransferFailed();
        }
        if (freelancerPayout > 0) {
            (bool flOk, ) = job.freelancer.call{value: freelancerPayout}("");
            if (!flOk) revert TransferFailed();
        }
        if (clientRefund > 0) {
            (bool clOk, ) = job.client.call{value: clientRefund}("");
            if (!clOk) revert TransferFailed();
        }
    }
}
