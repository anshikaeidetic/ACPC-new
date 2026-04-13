import { DEFAULT_GROQ_MODEL, extractJson, getGroqClient } from "@/lib/acpc/groq";
import { buildRecommendations } from "@/lib/acpc/recommendations";
import { retrieveGroundedContext } from "@/lib/acpc/retrieval";
import { ChatRequest, ChatResponse, RecommendationOption, StudentProfile, SupportedLanguage } from "@/lib/acpc/types";

function localizedFollowUps(language: SupportedLanguage) {
  if (language === "gu") {
    return [
      "મારી માટે જરૂરી દસ્તાવેજોની યાદી આપો.",
      "મારા રેન્ક પ્રમાણે યોગ્ય કોલેજ વિકલ્પો બતાવો.",
      "હાલના સત્તાવાર કી-ડેટ્સ સમજાવો.",
    ];
  }

  return [
    "List the documents I should keep ready.",
    "Suggest college options based on my rank.",
    "Summarize the latest official dates for this course.",
  ];
}

function flattenRecommendations(options: RecommendationOption[]) {
  return options.slice(0, 4);
}

function buildFallbackResponse(input: {
  language: SupportedLanguage;
  selectedCourse?: StudentProfile["courseCode"];
  retrieval: ReturnType<typeof retrieveGroundedContext>;
  recommendations?: ReturnType<typeof buildRecommendations>;
}): ChatResponse {
  const topDocuments = input.retrieval.documents.slice(0, 3);
  const sourceTitles = topDocuments.map((document) => document.title).join("; ");

  const directAnswer =
    input.language === "gu"
      ? `પ્રમાણિત સ્રોતોના આધાર પર ઉપલબ્ધ માહિતી સંકલિત કરવામાં આવી છે. મુખ્ય સત્તાવાર દસ્તાવેજો: ${sourceTitles || "ACPC સત્તાવાર અપડેટ્સ"}.`
      : `A grounded response has been assembled from the synchronized official sources. The most relevant documents right now are: ${sourceTitles || "official ACPC updates"}.`;

  const warnings = [...input.retrieval.advisories];

  if (!process.env.GROQ_API_KEY) {
    warnings.push(
      "Generative synthesis is unavailable until GROQ_API_KEY is configured. Source-backed fallback mode is active.",
    );
  }

  return {
    language: input.language,
    mode: "fallback",
    selectedCourse: input.retrieval.courseCode ?? input.selectedCourse,
    directAnswer,
    nextSteps:
      input.recommendations?.nextSteps ??
      (input.language === "gu"
        ? ["સત્તાવાર કી-ડેટ્સ તપાસો.", "દસ્તાવેજોની તૈયારી કરો.", "રાઉન્ડ-વાઇઝ અપડેટ્સ પર નજર રાખો."]
        : ["Review the latest key dates.", "Keep documents ready.", "Track round-wise official updates."]),
    warnings,
    recommendedOptions: flattenRecommendations([
      ...(input.recommendations?.safeOptions ?? []),
      ...(input.recommendations?.competitiveOptions ?? []),
      ...(input.recommendations?.ambitiousOptions ?? []),
    ]),
    followUpPrompts: localizedFollowUps(input.language),
    sources: topDocuments.map((document) => ({
      title: document.title,
      url: document.url,
      kind: document.kind,
    })),
  };
}

export async function createChatResponse(input: ChatRequest) {
  const language = input.language ?? "en";
  const retrieval = retrieveGroundedContext({
    message: input.message,
    selectedCourse: input.selectedCourse,
    studentProfile: input.studentProfile,
  });

  const selectedCourse = retrieval.courseCode ?? input.selectedCourse;
  const recommendationProfile =
    selectedCourse && input.studentProfile?.meritRank
      ? ({
          courseCode: selectedCourse,
          meritRank: input.studentProfile.meritRank,
          category: input.studentProfile.category,
          preferredBranches: input.studentProfile.preferredBranches,
          preferredLocations: input.studentProfile.preferredLocations,
          instituteTypes: input.studentProfile.instituteTypes,
          budgetSensitivity: input.studentProfile.budgetSensitivity,
          language,
        } satisfies StudentProfile)
      : undefined;

  const recommendations = recommendationProfile
    ? buildRecommendations(recommendationProfile)
    : undefined;

  const fallback = buildFallbackResponse({
    language,
    selectedCourse,
    retrieval,
    recommendations,
  });

  const client = getGroqClient();

  if (!client) {
    return fallback;
  }

  const promptPayload = {
    language,
    selectedCourse,
    userQuestion: input.message,
    studentProfile: input.studentProfile ?? {},
    officialDocuments: retrieval.documents.map((document) => ({
      title: document.title,
      kind: document.kind,
      issuedOn: document.issuedOn,
      summary: document.summary,
      snippet: document.snippet,
      url: document.url,
    })),
    officialCutoffSummaries: retrieval.cutoffSummaries,
    officialSeatSummaries: retrieval.seatSummaries,
    advisories: retrieval.advisories,
    recommendationSummary: recommendations
      ? {
          summary: recommendations.summary,
          safeOptions: recommendations.safeOptions.map((option) => option.combinedLabel),
          competitiveOptions: recommendations.competitiveOptions.map(
            (option) => option.combinedLabel,
          ),
          ambitiousOptions: recommendations.ambitiousOptions.map(
            (option) => option.combinedLabel,
          ),
        }
      : null,
  };

  const completion = await client.chat.completions.create({
    model: DEFAULT_GROQ_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are ACPC Admission Support. Use only the provided official context for factual claims. Keep the tone institutional, direct, and operational. Clearly separate verified facts from advisory guidance. If the context is insufficient, say so instead of guessing. Return valid JSON with keys: directAnswer, nextSteps, warnings, followUpPrompts.",
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

  const parsed = extractJson<
    Pick<ChatResponse, "directAnswer" | "nextSteps" | "warnings" | "followUpPrompts">
  >(content);

  if (!parsed) {
    return fallback;
  }

  return {
    ...fallback,
    mode: "grounded",
    directAnswer: parsed.directAnswer || fallback.directAnswer,
    nextSteps: parsed.nextSteps?.length ? parsed.nextSteps : fallback.nextSteps,
    warnings: parsed.warnings?.length ? parsed.warnings : fallback.warnings,
    followUpPrompts: parsed.followUpPrompts?.length
      ? parsed.followUpPrompts
      : fallback.followUpPrompts,
  };
}
