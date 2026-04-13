import Groq from "groq-sdk";

export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

export function extractJson<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
