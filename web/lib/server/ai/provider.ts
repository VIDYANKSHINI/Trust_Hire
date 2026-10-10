import { NoulQuestion, jevNoul } from "./jev";
import { llmNoul } from "./llm";

export type { NoulQuestion };
export type NoulResult = {
  answers: Record<string, number>;
  provider: "jev" | "llm";
};

/**
 * Unified provider adapter.
 * Tries Jev first (if key configured), falls back to LLM automatically on error or missing key.
 */
export async function askNoul(
  state: string,
  questions: NoulQuestion[]
): Promise<NoulResult> {
  const hasJevKey = Boolean(process.env.JEV_API_KEY);

  if (hasJevKey) {
    try {
      const answers = await jevNoul(state, questions);
      return { answers, provider: "jev" };
    } catch (err) {
      console.warn("Jev decision call failed or timed out. Falling back to LLM:", err);
    }
  }

  // Fallback to LLM
  const answers = await llmNoul(state, questions);
  return { answers, provider: "llm" };
}
