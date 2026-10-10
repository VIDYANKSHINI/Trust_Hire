export type NoulQuestion = { id: string; instructions: string };

/**
 * Calls TypeSafe Jev decision model endpoint with a strict 4-second timeout.
 * Re-throws on any error, timeout, non-200, or invalid payload.
 */
export async function jevNoul(
  state: string,
  questions: NoulQuestion[]
): Promise<Record<string, number>> {
  const apiKey = process.env.JEV_API_KEY;
  if (!apiKey) {
    throw new Error("JEV_API_KEY is not set");
  }

  const baseUrl = process.env.JEV_BASE_URL || "https://api.aimlapi.com/v1/decisions";
  const model = process.env.JEV_MODEL || "typesafe/jev";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout

  try {
    const payload = {
      model,
      state,
      questions: questions.map((q) => ({
        id: q.id,
        type: "noul",
        instructions: q.instructions,
      })),
    };

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Jev API responded with status ${res.status}`);
    }

    const data = await res.json();
    const answers: Record<string, number> = {};

    if (!data.answers || typeof data.answers !== "object") {
      throw new Error("Malformed Jev response: missing answers object");
    }

    for (const q of questions) {
      const prob = data.answers[q.id];
      if (typeof prob !== "number" || isNaN(prob) || prob < 0 || prob > 1) {
        throw new Error(`Invalid probability for question ${q.id}: ${prob}`);
      }
      answers[q.id] = prob;
    }

    return answers;
  } finally {
    clearTimeout(timeoutId);
  }
}
