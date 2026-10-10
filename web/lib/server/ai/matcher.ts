import { askNoul, NoulQuestion, NoulResult } from "./provider";
import { Brief, Address, Stats } from "@/lib/types";

export interface CandidateApp {
  applicant: Address;
  pitch: string;
  skills: string[];
  stats: Stats;
}

export interface MatchScoreResult {
  applicant: Address;
  matchScore: number | null;
  matchDetail: { skillsFit: number; experienceFit: number; scopeFit: number } | null;
  provider: "jev" | "llm" | null;
}

const MATCHER_QUESTIONS: NoulQuestion[] = [
  {
    id: "skillsFit",
    instructions: "The applicant's listed skills match what the brief requires.",
  },
  {
    id: "experienceFit",
    instructions: "The applicant's pitch shows relevant experience for this kind of work.",
  },
  {
    id: "scopeFit",
    instructions: "The applicant's pitch shows they understand the scope and the acceptance criteria.",
  },
];

export async function scoreApplicant(
  brief: Brief,
  candidate: CandidateApp
): Promise<MatchScoreResult> {
  const briefJson = JSON.stringify(brief);
  const state = `<data>\n${briefJson}\n---APPLICANT---\n${candidate.pitch}\nSkills: ${candidate.skills.join(", ")}\n</data>`;

  try {
    const result: NoulResult = await askNoul(state, MATCHER_QUESTIONS);

    const sFit = result.answers.skillsFit ?? 0;
    const eFit = result.answers.experienceFit ?? 0;
    const scFit = result.answers.scopeFit ?? 0;

    const matchScore = Math.round(100 * (0.4 * sFit + 0.35 * eFit + 0.25 * scFit));
    const matchDetail = {
      skillsFit: Math.round(sFit * 100),
      experienceFit: Math.round(eFit * 100),
      scopeFit: Math.round(scFit * 100),
    };

    return {
      applicant: candidate.applicant,
      matchScore,
      matchDetail,
      provider: result.provider,
    };
  } catch (err) {
    console.warn(`Failed to score applicant ${candidate.applicant}:`, err);
    return {
      applicant: candidate.applicant,
      matchScore: null,
      matchDetail: null,
      provider: null,
    };
  }
}
