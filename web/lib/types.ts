export type Address = `0x${string}`;

export enum JobState {
  Funded = 0,
  Accepted = 1,
  Submitted = 2,
  ClientReview = 3,
  Released = 4,
  Refunded = 5,
  Cancelled = 6,
  Disputed = 7,
  Resolved = 8,
}

export interface Job {
  client: Address;
  freelancer: Address; // 0x0 until accepted
  designated: Address; // 0x0 if none assigned
  amount: bigint; // wei
  deadline: bigint; // unix seconds, delivery deadline
  submittedAt: bigint;
  reviewDeadline: bigint; // 0 until ClientReview opened; stays set afterwards
  confidenceBps: number; // 0 until verdict
  state: number; // JobState
  briefHash: `0x${string}`;
  deliverableHash: `0x${string}`; // 0x00..00 until submitted
  title: string;
}

export interface Stats {
  completed: number;
  ghosted: number;
  abandoned: number;
  disputed: number;
}

export type Provider = "jev" | "llm" | "error";

export interface Application {
  applicant: Address;
  pitch: string;
  skills: string[];
  matchScore: number | null; // 0-100
  matchDetail: { skillsFit: number; experienceFit: number; scopeFit: number } | null; // each 0-100
  provider: Provider | null;
  stats: Stats; // read from chain at response time
}

export interface Brief {
  description: string; // detailed work, <= 4000 chars
  criteria: string[]; // acceptance criteria, 1..8 items, each <= 200 chars
}

export interface ApiError {
  error: string;
  code: string;
}
