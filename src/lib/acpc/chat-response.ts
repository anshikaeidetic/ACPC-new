import { getCourseDefinition } from "@/lib/acpc/course-definitions";
import { buildRecommendations } from "@/lib/acpc/recommendations";
import { RetrievalResult } from "@/lib/acpc/retrieval";
import {
  ChatRequest,
  ChatResponse,
  ChatResponseKind,
  RecommendationOption,
  SourceDocument,
  SourceReference,
  SupportedLanguage,
} from "@/lib/acpc/types";

const MOJIBAKE_PATTERN = /(?:Ã|Â|àª|à«|�)/;

const QUESTION_KEYWORDS: Record<Exclude<ChatResponseKind, "general">, string[]> = {
  schedule: [
    "date",
    "dates",
    "deadline",
    "schedule",
    "timeline",
    "latest",
    "key date",
    "important date",
    "તારીખ",
    "સમયપત્રક",
    "શેડ્યૂલ",
    "કી ડેટ",
  ],
  eligibility: [
    "eligible",
    "eligibility",
    "criteria",
    "minimum marks",
    "qualified",
    "યોગ્યતા",
    "પાત્રતા",
    "માપદંડ",
  ],
  documents: [
    "document",
    "documents",
    "certificate",
    "certificates",
    "upload",
    "proof",
    "દસ્તાવેજ",
    "પ્રમાણપત્ર",
    "સર્ટિફિકેટ",
  ],
  process: [
    "process",
    "registration",
    "apply",
    "application",
    "choice filling",
    "allotment",
    "reporting",
    "confirmation",
    "registration fee",
    "પ્રક્રિયા",
    "રજીસ્ટ્રેશન",
    "ચોઇસ",
    "અલોટમેન્ટ",
    "રિપોર્ટિંગ",
  ],
  cutoff: [
    "cutoff",
    "closure",
    "closing rank",
    "seat matrix",
    "vacancy",
    "merit rank",
    "કટઓફ",
    "ક્લોઝર",
    "રેન્ક",
    "સીટ",
    "વેકન્સી",
  ],
  contact: [
    "contact",
    "phone",
    "email",
    "helpline",
    "helpdesk",
    "office",
    "સંપર્ક",
    "ફોન",
    "ઇમેઇલ",
    "હેલ્પલાઇન",
  ],
  recommendation: [
    "suggest",
    "recommend",
    "best college",
    "which college",
    "options",
    "college option",
    "branch option",
    "profile",
    "preference",
    "suggestion",
    "વિકલ્પ",
    "સૂચન",
    "કોલેજ",
    "પ્રેફરન્સ",
  ],
};

function normalizeForSearch(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ");
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizeString(item))
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(/\s*(?:\n|;|•|\u2022|\|\s+|\d+\.\s+)\s*/u)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  return [];
}

function buildSourceReferences(documents: SourceDocument[]): SourceReference[] {
  return Array.from(new Map(documents.map((document) => [document.id, document])).values())
    .slice(0, 5)
    .map((document) => ({
      title: document.title,
      url: document.url,
      kind: document.kind,
      issuedOn: document.issuedOn,
    }));
}

function formatDateForLanguage(dateValue: string, language: SupportedLanguage) {
  const match = dateValue.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (!match) {
    return dateValue;
  }

  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return new Intl.DateTimeFormat(language === "gu" ? "gu-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateRange(value: string, language: SupportedLanguage) {
  const parts = value.split(/\s+to\s+/i).map((part) => part.trim());

  if (parts.length === 2) {
    return `${formatDateForLanguage(parts[0], language)} to ${formatDateForLanguage(parts[1], language)}`;
  }

  return formatDateForLanguage(value, language);
}

function cleanTimelineActivity(value: string) {
  return value
    .replace(/\bAdmission Activity\b/gi, "")
    .replace(/\bDate \(.*?\)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTimelineItems(documents: SourceDocument[], language: SupportedLanguage) {
  const items: string[] = [];

  for (const document of documents.filter((entry) => entry.kind === "key-date")) {
    const snippet = getDocumentExcerpt(document);
    const relevantText = snippet.replace(/^.*?Admission Activity Date/iu, " ");
    const matcher =
      /([A-Za-z][A-Za-z/&(),\-\s]{6,}?)\s+(\d{2}\.\d{2}\.\d{4}(?:\s+to\s+\d{2}\.\d{2}\.\d{4})?)/g;

    for (const match of relevantText.matchAll(matcher)) {
      const activity = cleanTimelineActivity(match[1]);
      const date = formatDateRange(match[2], language);

      if (activity.length < 6) {
        continue;
      }

      items.push(`${date}: ${activity}`);

      if (items.length === 5) {
        return items;
      }
    }
  }

  return items;
}

function flattenRecommendationOptions(recommendations?: ReturnType<typeof buildRecommendations>) {
  if (!recommendations) {
    return [];
  }

  return [
    ...recommendations.safeOptions.slice(0, 2),
    ...recommendations.competitiveOptions.slice(0, 2),
    ...recommendations.ambitiousOptions.slice(0, 2),
  ].slice(0, 5);
}

function recommendationLine(option: RecommendationOption) {
  const rank = typeof option.closingRank === "number" ? `closing rank ${option.closingRank}` : "";
  return [option.combinedLabel, rank].filter(Boolean).join(" | ");
}

export function hasMojibake(value: string) {
  return MOJIBAKE_PATTERN.test(value);
}

export function containsGujaratiCharacters(value: string) {
  return /[\u0A80-\u0AFF]/u.test(value);
}

export function getDocumentExcerpt(document: SourceDocument) {
  const snippet = document.snippet.replace(/\s+/g, " ").trim();
  const summary = document.summary.replace(/\s+/g, " ").trim();

  if (snippet && !hasMojibake(snippet)) {
    return snippet;
  }

  if (summary && !hasMojibake(summary)) {
    return summary;
  }

  return summary || snippet;
}

export function classifyQuestion(
  message: string,
  studentProfile?: ChatRequest["studentProfile"],
): ChatResponseKind {
  const normalized = normalizeForSearch(`${message} ${JSON.stringify(studentProfile ?? {})}`);

  if (QUESTION_KEYWORDS.contact.some((keyword) => normalized.includes(keyword))) {
    return "contact";
  }

  if (QUESTION_KEYWORDS.recommendation.some((keyword) => normalized.includes(keyword))) {
    return "recommendation";
  }

  if (QUESTION_KEYWORDS.cutoff.some((keyword) => normalized.includes(keyword))) {
    return "cutoff";
  }

  if (QUESTION_KEYWORDS.schedule.some((keyword) => normalized.includes(keyword))) {
    return "schedule";
  }

  if (QUESTION_KEYWORDS.documents.some((keyword) => normalized.includes(keyword))) {
    return "documents";
  }

  if (QUESTION_KEYWORDS.eligibility.some((keyword) => normalized.includes(keyword))) {
    return "eligibility";
  }

  if (QUESTION_KEYWORDS.process.some((keyword) => normalized.includes(keyword))) {
    return "process";
  }

  return studentProfile?.meritRank ? "recommendation" : "general";
}

function buildLocalizedSuggestions(language: SupportedLanguage) {
  if (language === "gu") {
    return [
      "મારે માટે જરૂરી દસ્તાવેજોની યાદી આપો.",
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

function buildFallbackHighlights(input: {
  responseKind: ChatResponseKind;
  retrieval: RetrievalResult;
  recommendations?: ReturnType<typeof buildRecommendations>;
  language: SupportedLanguage;
}) {
  switch (input.responseKind) {
    case "schedule":
      return extractTimelineItems(input.retrieval.documents, input.language);
    case "cutoff":
      return input.retrieval.cutoffSummaries.slice(0, 4);
    case "recommendation": {
      const lines = flattenRecommendationOptions(input.recommendations).map(recommendationLine);
      return lines.length > 0
        ? lines
        : input.language === "gu"
          ? ["રેન્ક, કેટેગરી અને પસંદગીની શાખા આપશો તો યોગ્ય વિકલ્પો ગોઠવી શકીશ."]
          : ["Share rank, category, and preferred branches to get a sharper option list."];
    }
    case "contact":
      return input.retrieval.advisories.slice(0, 3);
    default:
      return [];
  }
}

function buildFallbackAnswer(input: {
  language: SupportedLanguage;
  responseKind: ChatResponseKind;
  courseLabel: string;
  retrieval: RetrievalResult;
  recommendations?: ReturnType<typeof buildRecommendations>;
  extraNotes?: string[];
}) {
  const topDocument = input.retrieval.documents[0];
  const topSourceText = topDocument ? `"${topDocument.title}"` : "the synchronized official ACPC documents";
  const recommendationOptions = flattenRecommendationOptions(input.recommendations);
  const advisoryText = [...input.retrieval.advisories, ...(input.extraNotes ?? [])]
    .filter(Boolean)
    .join(" ");

  if (input.language === "gu") {
    switch (input.responseKind) {
      case "schedule":
        return `હાલની સત્તાવાર તારીખો માટે ${topSourceText} મુખ્ય સ્રોત છે. સૌથી મહત્વની બાબત એ છે કે નોંધણી અને ઓનલાઇન ફી ચુકવણીની છેલ્લી તારીખ 31 મે 2026 છે, પ્રોવિઝનલ મેરિટ 12 જૂન 2026એ જાહેર થાય છે, અને મૉક રાઉન્ડનું પરિણામ તથા ફાઇનલ મેરિટ 17 જૂન 2026એ આવે છે.${advisoryText ? ` ${advisoryText}` : ""}`;
      case "documents":
        return `${input.courseLabel} માટે દસ્તાવેજ ચકાસતી વખતે Information Brochure અને General Instructions ને મુખ્ય સ્રોત માનો. નામ, જન્મતારીખ, ગુણ, કેટેગરી અને સંપર્ક વિગતો બધા રેકોર્ડમાં સરખી હોવી જોઈએ, અને અપલોડ માટે સ્પષ્ટ નકલો સાથે મૂળ દસ્તાવેજો પણ તૈયાર રાખવા જોઈએ.${advisoryText ? ` ${advisoryText}` : ""}`;
      case "eligibility":
        return `${input.courseLabel} માટે યોગ્યતા ચકાસતી વખતે પ્રવેશ આધાર, કેટેગરી નિયમો અને લાયકાતના માપદંડ સીધા સત્તાવાર માર્ગદર્શિકા સામે મેળવો. જો કોઈ શરતી નિયમ લાગુ પડે તો અંતિમ સબમિશન પહેલાં પોર્ટલ પરની નવી સૂચના ફરી તપાસવી જોઈએ.${advisoryText ? ` ${advisoryText}` : ""}`;
      case "process":
        return `${input.courseLabel} માટે પ્રક્રિયા સમજવા માટે સત્તાવાર કી-ડેટ્સ, માર્ગદર્શિકા અને જનરલ ઇન્સ્ટ્રક્શન ત્રણેય સાથે વાંચવા જોઈએ. ખાસ ધ્યાન નોંધણી, મેરિટ લિસ્ટ, ચોઇસ ફિલિંગ, મૉક રાઉન્ડ અને અંતિમ કન્ફર્મેશન પર રાખો.${advisoryText ? ` ${advisoryText}` : ""}`;
      case "cutoff":
        return `${input.courseLabel} માટેના ક્લોઝર અને સીટ ટ્રેન્ડ્સ માત્ર અગાઉના સત્તાવાર રેકોર્ડ પરથી વાંચવા જોઈએ, કારણ કે અંતિમ એલોટમેન્ટ લાઇવ મેરિટ અને રાઉન્ડ ડાયનેમિક્સ પર આધારિત હોય છે.${advisoryText ? ` ${advisoryText}` : ""}`;
      case "recommendation":
        return recommendationOptions.length > 0
          ? `${input.courseLabel} માટે ઉપલબ્ધ સત્તાવાર ક્લોઝર રેકોર્ડ અને આપેલી પ્રોફાઇલના આધારે કેટલાક યોગ્ય વિકલ્પો ગોઠવાયા છે. પહેલા સેફ, પછી સ્પર્ધાત્મક અને પછી આકાંક્ષી વિકલ્પોનું સંતુલન રાખવું યોગ્ય રહેશે.${advisoryText ? ` ${advisoryText}` : ""}`
          : `${input.courseLabel} માટે સારી ભલામણ આપવા માટે મેરિટ રેન્ક, કેટેગરી, પસંદગીની શાખા અને શહેર જરૂરી છે. આ વિગતો મળ્યા પછી વિકલ્પોને સેફ, સ્પર્ધાત્મક અને આકાંક્ષી બેન્ડમાં ગોઠવી શકાય.${advisoryText ? ` ${advisoryText}` : ""}`;
      case "contact":
        return `સંપર્ક માટે ACPC હેલ્પડેસ્કનો જ ઉપયોગ કરો. સક્રિય પ્રવેશ સમયગાળા દરમિયાન સત્તાવાર પોર્ટલ અને હેલ્પલાઇન બંને નિયમિત તપાસવા જોઈએ.${advisoryText ? ` ${advisoryText}` : ""}`;
      default:
        return `${input.courseLabel} માટે સૌથી વિશ્વસનીય જવાબ ${topSourceText} અને સંબંધિત સત્તાવાર ACPC દસ્તાવેજોથી જ મળશે. તમે તારીખો, દસ્તાવેજો, યોગ્યતા, ચોઇસ ફિલિંગ, સીટ સ્થિતિ અથવા કોલેજ વિકલ્પો વિશે વધુ ચોક્કસ પ્રશ્ન પૂછશો તો હું તેને સીધા સત્તાવાર સ્રોત સાથે ગોઠવી શકીશ.${advisoryText ? ` ${advisoryText}` : ""}`;
    }
  }

  switch (input.responseKind) {
    case "schedule":
      return `For the current timeline, ${topSourceText} is the primary source. The main checkpoints right now are that registration and online fee payment close on 31 May 2026, the provisional merit list is on 12 June 2026, and both the mock-round result and final merit list are on 17 June 2026.${advisoryText ? ` ${advisoryText}` : ""}`;
    case "documents":
      return `For document verification, treat the Information Brochure and General Instructions as the primary source. Before registration, make sure the candidate name, date of birth, marks, category details, and contact details match across every record, and keep both readable upload copies and originals ready.${advisoryText ? ` ${advisoryText}` : ""}`;
    case "eligibility":
      return `For eligibility, match the admission basis, category rule, and qualifying criteria directly against the latest official guideline instead of relying on old summaries. If any conditional rule applies, recheck the portal before final submission.${advisoryText ? ` ${advisoryText}` : ""}`;
    case "process":
      return `For the process flow, read the key-date document, the official guideline, and the general instructions together. The critical checkpoints are registration, merit publication, choice filling, mock round, final allotment, and confirmation.${advisoryText ? ` ${advisoryText}` : ""}`;
    case "cutoff":
      return `For cutoff interpretation, use only the published official closure and seat records. Those records are useful for positioning, but final allotment still depends on the live merit pool, category movement, and round-by-round seat behavior.${advisoryText ? ` ${advisoryText}` : ""}`;
    case "recommendation":
      return recommendationOptions.length > 0
        ? `Using the synchronized official closure data and the submitted profile, I can already position a few suitable options for ${input.courseLabel}. The right approach is to keep a spread across safe, competitive, and ambitious choices instead of clustering everything into one band.${advisoryText ? ` ${advisoryText}` : ""}`
        : `To suggest useful options for ${input.courseLabel}, I need the merit rank, category, preferred branches, and preferred locations. Once those are available, I can group options into safe, competitive, and ambitious bands using the official closure record.${advisoryText ? ` ${advisoryText}` : ""}`;
    case "contact":
      return `Use the official ACPC helpdesk for contact-related issues, especially during active admission windows. The safest practice is to confirm any time-sensitive instruction on the portal before acting on it.${advisoryText ? ` ${advisoryText}` : ""}`;
    default:
      return `The most reliable answer for ${input.courseLabel} has to stay tied to ${topSourceText} and the related official ACPC documents. If you ask a narrower question about dates, documents, eligibility, choice filling, seat status, or college options, I can answer it much more directly.${advisoryText ? ` ${advisoryText}` : ""}`;
  }
}

export function buildFallbackChatResponse(input: {
  language: SupportedLanguage;
  selectedCourse?: ChatRequest["selectedCourse"];
  responseKind: ChatResponseKind;
  retrieval: RetrievalResult;
  recommendations?: ReturnType<typeof buildRecommendations>;
  extraNotes?: string[];
}) {
  const courseCode = input.retrieval.courseCode ?? input.selectedCourse;
  const courseLabel = courseCode
    ? (getCourseDefinition(courseCode)?.label ?? "Selected course")
    : "ACPC course";

  return {
    language: input.language,
    deliveryMode: "fallback",
    selectedCourse: courseCode,
    responseKind: input.responseKind,
    answer: buildFallbackAnswer({
      language: input.language,
      responseKind: input.responseKind,
      courseLabel,
      retrieval: input.retrieval,
      recommendations: input.recommendations,
      extraNotes: input.extraNotes,
    }),
    highlights: buildFallbackHighlights({
      responseKind: input.responseKind,
      retrieval: input.retrieval,
      recommendations: input.recommendations,
      language: input.language,
    }),
    sources: buildSourceReferences(input.retrieval.documents),
    suggestions: buildLocalizedSuggestions(input.language),
  } satisfies ChatResponse;
}

export function normalizeModelResponse(raw: unknown, fallback: ChatResponse): ChatResponse {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const input = raw as Record<string, unknown>;
  const answer = normalizeString(input.answer);
  const highlights = normalizeStringArray(input.highlights).slice(0, 6);
  const suggestions = normalizeStringArray(input.suggestions).slice(0, 4);

  if (!answer) {
    return fallback;
  }

  return {
    ...fallback,
    deliveryMode: "grounded",
    answer,
    highlights: highlights.length > 0 ? highlights : fallback.highlights,
    suggestions: suggestions.length > 0 ? suggestions : fallback.suggestions,
  };
}
