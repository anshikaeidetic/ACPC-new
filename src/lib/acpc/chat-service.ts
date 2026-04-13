import {
  buildFallbackChatResponse,
  classifyQuestion,
  containsGujaratiCharacters,
  getDocumentExcerpt,
  hasMojibake,
  normalizeModelResponse,
} from "@/lib/acpc/chat-response";
import { DEFAULT_GROQ_MODEL, extractJson, getGroqClient } from "@/lib/acpc/groq";
import { buildRecommendations } from "@/lib/acpc/recommendations";
import { retrieveGroundedContext } from "@/lib/acpc/retrieval";
import { ChatRequest, ChatResponse, ChatResponseKind, StudentProfile } from "@/lib/acpc/types";

const MODEL_ASSISTED_RESPONSE_KINDS: ChatResponseKind[] = ["schedule"];

function buildRecommendationProfile(input: {
  selectedCourse?: ChatRequest["selectedCourse"];
  studentProfile?: ChatRequest["studentProfile"];
  language: ChatRequest["language"];
}) {
  if (!input.selectedCourse || !input.studentProfile?.meritRank) {
    return undefined;
  }

  return {
    courseCode: input.selectedCourse,
    meritRank: input.studentProfile.meritRank,
    category: input.studentProfile.category,
    preferredBranches: input.studentProfile.preferredBranches,
    preferredLocations: input.studentProfile.preferredLocations,
    instituteTypes: input.studentProfile.instituteTypes,
    budgetSensitivity: input.studentProfile.budgetSensitivity,
    language: input.language,
  } satisfies StudentProfile;
}

function buildSystemPrompt(language: ChatRequest["language"], responseKind: string) {
  return [
    "You are ACPC Admission Support.",
    "Use only the provided official context for factual claims.",
    "Keep the tone institutional, direct, and operational.",
    "Answer in a natural GPT-like style: direct, useful, and easy to read.",
    "Do not sound robotic or like a report generator.",
    "Avoid headings unless absolutely necessary.",
    "Use short bullet points only if they improve clarity.",
    "If the context is insufficient, say that directly instead of guessing.",
    `Write the response in ${language === "gu" ? "Gujarati" : "English"}.`,
    `The response kind is ${responseKind}.`,
    "Return valid JSON with exactly these keys: answer, highlights, suggestions.",
    "answer must be a single helpful response string.",
    "highlights must be a short array of supporting bullet lines when useful, otherwise an empty array.",
    "suggestions must be a short array of follow-up prompts.",
    "Do not include markdown fences or prose outside the JSON object.",
  ].join(" ");
}

export async function createChatResponse(input: ChatRequest): Promise<ChatResponse> {
  const language = input.language ?? "en";
  const responseKind = classifyQuestion(input.message, input.studentProfile);
  const retrieval = retrieveGroundedContext({
    message: input.message,
    selectedCourse: input.selectedCourse,
    studentProfile: input.studentProfile,
    responseKind,
  });

  const selectedCourse = retrieval.courseCode ?? input.selectedCourse;
  const recommendationProfile = buildRecommendationProfile({
    selectedCourse,
    studentProfile: input.studentProfile,
    language,
  });
  const recommendations = recommendationProfile
    ? buildRecommendations(recommendationProfile)
    : undefined;

  const fallback = buildFallbackChatResponse({
    language,
    selectedCourse,
    responseKind,
    retrieval,
    recommendations,
    extraNotes: !process.env.GROQ_API_KEY
      ? [
          language === "gu"
            ? "GROQ_API_KEY સેટ ન હોવાથી જવાબ સુરક્ષિત સોર્સ આધારિત ફૉલબૅક મોડમાં આપવામાં આવ્યો છે."
            : "GROQ_API_KEY is not configured, so the response is being served in source-backed fallback mode.",
        ]
      : undefined,
  });

  const client = getGroqClient();

  if (!client || !MODEL_ASSISTED_RESPONSE_KINDS.includes(responseKind)) {
    return fallback;
  }

  const promptPayload = {
    language,
    responseKind,
    selectedCourse,
    userQuestion: input.message,
    studentProfile: input.studentProfile ?? {},
    officialDocuments: retrieval.documents.map((document) => ({
      title: document.title,
      kind: document.kind,
      issuedOn: document.issuedOn,
      summary: document.summary,
      excerpt: getDocumentExcerpt(document),
      url: document.url,
    })),
    officialCutoffSummaries: retrieval.cutoffSummaries,
    officialSeatSummaries: retrieval.seatSummaries,
    advisories: retrieval.advisories,
    recommendationSummary: recommendations
      ? {
          summary: recommendations.summary,
          warnings: recommendations.warnings,
          safeOptions: recommendations.safeOptions.map((option) => ({
            label: option.combinedLabel,
            detail: option.rationale,
            bucket: option.bucket,
          })),
          competitiveOptions: recommendations.competitiveOptions.map((option) => ({
            label: option.combinedLabel,
            detail: option.rationale,
            bucket: option.bucket,
          })),
          ambitiousOptions: recommendations.ambitiousOptions.map((option) => ({
            label: option.combinedLabel,
            detail: option.rationale,
            bucket: option.bucket,
          })),
          nextSteps: recommendations.nextSteps,
        }
      : null,
  };

  try {
    const completion = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(language, responseKind),
        },
        {
          role: "user",
          content: JSON.stringify(promptPayload),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return fallback;
    }

    const parsed = extractJson<unknown>(content);
    const normalized = normalizeModelResponse(parsed, fallback);

    if (language === "gu") {
      const gujaratiPayload = `${normalized.answer} ${JSON.stringify(normalized.highlights)}`;

      if (hasMojibake(gujaratiPayload) || !containsGujaratiCharacters(gujaratiPayload)) {
        return fallback;
      }
    }

    return normalized;
  } catch {
    return buildFallbackChatResponse({
      language,
      selectedCourse,
      responseKind,
      retrieval,
      recommendations,
      extraNotes: [
        language === "gu"
          ? "મોડલ સિન્થેસિસ નિષ્ફળ જતા જવાબ સુરક્ષિત સોર્સ આધારિત મોડમાં આપવામાં આવ્યો છે."
          : "Model synthesis failed, so the response has been served in safe source-backed mode.",
      ],
    });
  }
}
