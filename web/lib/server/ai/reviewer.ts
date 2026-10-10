import { askNoul, NoulQuestion, NoulResult } from "./provider";
import { Brief } from "@/lib/types";

export interface ReviewOutcome {
  pass: boolean;
  confidenceBps: number;
  provider: "jev" | "llm";
  confidence: number;
}

const REVIEW_QUESTIONS: NoulQuestion[] = [
  {
    id: "criteria",
    instructions: "The deliverable satisfies every acceptance criterion listed in the brief.",
  },
  {
    id: "substantive",
    instructions: "The deliverable is real, substantive work for the described job, not placeholder, empty, or off-topic content.",
  },
];

/**
 * Reviews a deliverable against the client's brief.
 * Conservative scoring: confidence is min(criteria, substantive).
 */
export async function reviewDeliverable(
  brief: Brief,
  deliverable: string,
  confidenceThresholdBps: number = 7500
): Promise<ReviewOutcome> {
  const briefJson = JSON.stringify(brief);
  const state = `<data>\n${briefJson}\n---DELIVERABLE---\n${deliverable}\n</data>`;

  const result: NoulResult = await askNoul(state, REVIEW_QUESTIONS);

  const criteriaScore = result.answers.criteria ?? 0;
  const substantiveScore = result.answers.substantive ?? 0;

  const confidence = Math.min(criteriaScore, substantiveScore);
  const confidenceBps = Math.round(confidence * 10000);
  const pass = confidenceBps >= confidenceThresholdBps;

  return {
    pass,
    confidenceBps,
    provider: result.provider,
    confidence,
  };
}
