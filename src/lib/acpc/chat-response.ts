import { getCourseDefinition } from "@/lib/acpc/course-definitions";
import { buildRecommendations } from "@/lib/acpc/recommendations";
import { RetrievalResult } from "@/lib/acpc/retrieval";
import {
  ChatOptionItem,
  ChatRequest,
  ChatResponse,
  ChatResponseKind,
  ChatSection,
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
    "mock round",
    "important date",
    "કી ડેટ",
    "તારીખ",
    "સમયપત્રક",
    "શેડ્યૂલ",
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
    "college",
    "suggestion",
    "વિકલ્પ",
    "સૂચન",
    "કોલેજ",
    "પ્રેફરન્સ",
  ],
};

function normalizeForSearch(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function hasKeyword(message: string, keywords: string[]) {
  return keywords.some((keyword) => message.includes(keyword));
}

function splitStringList(value: string) {
  const normalized = value.replace(/\r/g, " ").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const bulletSplit = normalized
    .split(/\s*(?:\n|;|•|\u2022|\|\s+|\d+\.\s+|-\s+(?=[A-Z0-9અ-હ]))\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);

  if (bulletSplit.length > 1) {
    return bulletSplit;
  }

  return normalized
    .split(/\.\s+(?=[A-Zઅ-હ])/u)
    .map((part) => part.trim())
    .filter(Boolean);
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
          .filter((item) => item.length > 0),
      ),
    );
  }

  if (typeof value === "string") {
    return Array.from(new Set(splitStringList(value).filter((item) => item.length > 0)));
  }

  return [];
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

function formatIssuedOn(issuedOn: string | undefined, language: SupportedLanguage) {
  if (!issuedOn) {
    return "";
  }

  const match = issuedOn.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return issuedOn;
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return new Intl.DateTimeFormat(language === "gu" ? "gu-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
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

function buildTitle(responseKind: ChatResponseKind, courseLabel: string, language: SupportedLanguage) {
  if (language === "gu") {
    switch (responseKind) {
      case "schedule":
        return `${courseLabel} માટે સત્તાવાર સમયરેખા`;
      case "eligibility":
        return `${courseLabel} માટે પાત્રતા નોંધ`;
      case "documents":
        return `${courseLabel} માટે દસ્તાવેજ માર્ગદર્શન`;
      case "process":
        return `${courseLabel} માટે પ્રક્રિયા નોંધ`;
      case "cutoff":
        return `${courseLabel} માટે ક્લોઝર અને સીટ સ્થિતિ`;
      case "contact":
        return "ACPC સત્તાવાર સંપર્ક માહિતી";
      case "recommendation":
        return `${courseLabel} માટે વિકલ્પ મૂલ્યાંકન`;
      default:
        return `${courseLabel} માટે ACPC સત્તાવાર નોંધ`;
    }
  }

  switch (responseKind) {
    case "schedule":
      return `${courseLabel} official timeline`;
    case "eligibility":
      return `${courseLabel} eligibility note`;
    case "documents":
      return `${courseLabel} document guidance`;
    case "process":
      return `${courseLabel} process note`;
    case "cutoff":
      return `${courseLabel} closure and seat position`;
    case "contact":
      return "ACPC official contact note";
    case "recommendation":
      return `${courseLabel} option positioning`;
    default:
      return `${courseLabel} ACPC official note`;
  }
}

function buildSummary(input: {
  courseLabel: string;
  responseKind: ChatResponseKind;
  language: SupportedLanguage;
  retrieval: RetrievalResult;
  recommendations?: ReturnType<typeof buildRecommendations>;
}) {
  const topSource = input.retrieval.documents[0];
  const issuedOn = formatIssuedOn(topSource?.issuedOn, input.language);

  if (input.language === "gu") {
    switch (input.responseKind) {
      case "schedule":
        return topSource
          ? `${input.courseLabel} માટેની હાલની નોંધ "${topSource.title}"${issuedOn ? ` (${issuedOn})` : ""} અને સંબંધિત સત્તાવાર દસ્તાવેજો પર આધારિત છે.`
          : `${input.courseLabel} માટેની હાલની નોંધ ઉપલબ્ધ સત્તાવાર ACPC દસ્તાવેજો પર આધારિત છે.`;
      case "documents":
      case "eligibility":
      case "process":
        return `${input.courseLabel} માટેની આ નોંધ સમન્વયિત બ્રોશર, માર્ગદર્શિકા અને સત્તાવાર સૂચનાઓ પરથી તૈયાર કરવામાં આવી છે.`;
      case "cutoff":
        return `${input.courseLabel} માટેની ક્લોઝર અને સીટ સ્થિતિ સત્તાવાર પ્રકાશિત રેકોર્ડના આધારે ગોઠવવામાં આવી છે.`;
      case "recommendation":
        return input.recommendations
          ? `${input.courseLabel} માટે આ નોંધ સત્તાવાર ક્લોઝર રેકોર્ડ અને આપવામાં આવેલ પ્રોફાઇલ બંને પર આધારિત છે.`
          : `${input.courseLabel} માટે ગોઠવાયેલા વિકલ્પો આપવા માટે મેરિટ રેન્ક અને પસંદગીઓ જરૂરી છે.`;
      case "contact":
        return "આ નોંધ ACPCની સત્તાવાર હેલ્પડેસ્ક અને સંપર્ક માહિતી પર આધારિત છે.";
      default:
        return `${input.courseLabel} માટેની હાલની નોંધ ઉપલબ્ધ સત્તાવાર ACPC સ્રોતો પરથી તૈયાર કરવામાં આવી છે.`;
    }
  }

  switch (input.responseKind) {
    case "schedule":
      return topSource
        ? `This note is anchored to "${topSource.title}"${issuedOn ? ` issued on ${issuedOn}` : ""} and the related synchronized official documents for ${input.courseLabel}.`
        : `This note is based on the currently synchronized official ACPC documents for ${input.courseLabel}.`;
    case "documents":
    case "eligibility":
    case "process":
      return `This note is prepared from the synchronized brochure, guideline, and official instruction set for ${input.courseLabel}.`;
    case "cutoff":
      return `This note uses published closure and seat records that are currently synchronized for ${input.courseLabel}.`;
    case "recommendation":
      return input.recommendations
        ? `This note combines synchronized official closure data with the submitted profile for ${input.courseLabel}.`
        : `A merit rank and preference profile are required before grouped options can be prepared for ${input.courseLabel}.`;
    case "contact":
      return "This note is based on ACPC's current official contact and helpdesk information.";
    default:
      return `This note is based on the currently synchronized official ACPC sources for ${input.courseLabel}.`;
  }
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
    const excerpt = getDocumentExcerpt(document);
    const relevantText = excerpt.replace(/^.*?Admission Activity Date/iu, " ");
    const matcher =
      /([A-Za-z][A-Za-z/&(),\-\s]{6,}?)\s+(\d{2}\.\d{2}\.\d{4}(?:\s+to\s+\d{2}\.\d{2}\.\d{4})?)/g;

    for (const match of relevantText.matchAll(matcher)) {
      const activity = cleanTimelineActivity(match[1]);
      const date = formatDateRange(match[2], language);

      if (activity.length < 6) {
        continue;
      }

      items.push(`${date} - ${activity}`);

      if (items.length === 6) {
        break;
      }
    }

    if (items.length === 6) {
      break;
    }
  }

  if (items.length > 0) {
    return Array.from(new Set(items));
  }

  return documents.slice(0, 4).map((document) => {
    const issuedOn = formatIssuedOn(document.issuedOn, language);
    return issuedOn ? `${issuedOn} - ${document.title}` : document.title;
  });
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

function bucketLabel(bucket: RecommendationOption["bucket"], language: SupportedLanguage) {
  if (language === "gu") {
    if (bucket === "safe") {
      return "સેફ બેન્ડ";
    }

    if (bucket === "competitive") {
      return "સ્પર્ધાત્મક બેન્ડ";
    }

    return "આકાંક્ષી બેન્ડ";
  }

  if (bucket === "safe") {
    return "Safe band";
  }

  if (bucket === "competitive") {
    return "Competitive band";
  }

  return "Ambitious band";
}

function buildOptionsSection(
  recommendations: ReturnType<typeof buildRecommendations> | undefined,
  language: SupportedLanguage,
) {
  const options = flattenRecommendationOptions(recommendations).map((option) => {
    const meta = [
      bucketLabel(option.bucket, language),
      typeof option.closingRank === "number"
        ? language === "gu"
          ? `ક્લોઝિંગ રેન્ક ${option.closingRank}`
          : `Closing rank ${option.closingRank}`
        : null,
      option.category,
      option.instituteType,
    ].filter(Boolean) as string[];

    return {
      label: option.combinedLabel,
      detail: option.rationale,
      meta,
      bucket: option.bucket,
    } satisfies ChatOptionItem;
  });

  return options;
}

function buildOperationalChecklist(
  responseKind: ChatResponseKind,
  courseLabel: string,
  language: SupportedLanguage,
  recommendations?: ReturnType<typeof buildRecommendations>,
) {
  if (recommendations?.nextSteps.length) {
    return recommendations.nextSteps.slice(0, 4);
  }

  if (language === "gu") {
    switch (responseKind) {
      case "schedule":
        return [
          "છેલ્લી તારીખ પહેલાં નોંધણી અને ફી ચુકવણી પૂર્ણ કરો.",
          "પ્રોવિઝનલ અને ફાઇનલ મેરિટ જાહેર થયા પછી પોર્ટલ ફરી તપાસો.",
          "મોક રાઉન્ડ અને અંતિમ પસંદગીઓની વિન્ડો દરમિયાન ફેરફારો સમયસર પૂર્ણ કરો.",
        ];
      case "documents":
        return [
          "બ્રોશર અને સૂચનાઓમાં દર્શાવેલી દસ્તાવેજ યાદી સામે તમારી ફાઇલ ચકાસો.",
          "અપલોડ માટે વાંચી શકાય તેવી નકલો અને ચકાસણી માટે ઓરિજિનલ બંને તૈયાર રાખો.",
          "નામ, જન્મતારીખ, ગુણ, કેટેગરી અને સંપર્ક વિગતો તમામ દસ્તાવેજોમાં મેળ ખાતી હોવી જોઈએ.",
        ];
      case "eligibility":
        return [
          "લાયકાત, પ્રવેશ આધાર અને કેટેગરી નિયમો સત્તાવાર દસ્તાવેજ સામે મેળવો.",
          "જો કોઈ શરતી નિયમ લાગુ પડે તો સંબંધિત માર્ગદર્શિકા ફરી તપાસો.",
          "અંતિમ ફોર્મ ભરતા પહેલાં પ્રવેશ પોર્ટલ પર અપડેટ્સ જુઓ.",
        ];
      case "recommendation":
        return [
          "મેરિટ રેન્ક, કેટેગરી, પસંદગીની શાખા અને શહેર શેર કરો.",
          `${courseLabel} માટે સેફ, સ્પર્ધાત્મક અને આકાંક્ષી વિકલ્પોનું સંતુલન રાખો.`,
          "ફાઇનલ પસંદગી લોક કરતાં પહેલાં સત્તાવાર કી-ડેટ્સ તપાસો.",
        ];
      default:
        return [
          "સત્તાવાર પોર્ટલ પર હાલની સૂચનાઓ દૈનિક તપાસો.",
          "ફાઇનલ સબમિશન પહેલાં દસ્તાવેજો અને સમયમર્યાદા બંને ચકાસો.",
          `${courseLabel} માટે કોર્સ-સ્પેસિફિક અપડેટ્સ અલગથી તપાસો.`,
        ];
    }
  }

  switch (responseKind) {
    case "schedule":
      return [
        "Complete registration and fee payment before the published deadline.",
        "Recheck the portal when provisional and final merit events are published.",
        "Finish mock-round and final choice updates within the active window.",
      ];
    case "documents":
      return [
        "Check your file against the latest brochure and instruction set.",
        "Keep readable upload copies and original documents ready for verification.",
        "Verify name, date of birth, marks, category, and contact details across all records.",
      ];
    case "eligibility":
      return [
        "Match admission basis, category rules, and qualifying criteria against the latest official document.",
        "Recheck any conditional rule in the applicable guideline before submission.",
        "Review portal updates again before locking the final application.",
      ];
    case "recommendation":
      return [
        "Share merit rank, category, preferred branches, and preferred locations.",
        `Keep ${courseLabel} choices distributed across safe, competitive, and ambitious bands.`,
        "Recheck the latest key dates before locking final preferences.",
      ];
    default:
      return [
        "Review the current official notice set on the ACPC portal.",
        "Verify deadlines and document readiness before submission.",
        `Track course-specific updates for ${courseLabel} separately.`,
      ];
  }
}

function buildAdvisoryNote(
  retrieval: RetrievalResult,
  language: SupportedLanguage,
  recommendations?: ReturnType<typeof buildRecommendations>,
) {
  const advisoryLines = [
    ...retrieval.advisories,
    ...(recommendations?.warnings ?? []),
  ].filter(Boolean);

  if (advisoryLines.length > 0) {
    return advisoryLines.join(" ");
  }

  if (language === "gu") {
    return "સત્તાવાર પોર્ટલ, બ્રોશર અને રાઉન્ડ-વાઇઝ અપડેટ્સને અંતિમ સત્તાધિક સ્રોત માનો.";
  }

  return "Treat the official portal, brochure, and round-wise updates as the final authority.";
}

function buildSections(input: {
  responseKind: ChatResponseKind;
  language: SupportedLanguage;
  courseLabel: string;
  retrieval: RetrievalResult;
  recommendations?: ReturnType<typeof buildRecommendations>;
}) {
  const referenceItems = input.retrieval.documents
    .slice(0, 4)
    .map((document) => document.title);

  const sourceSectionTitle = input.language === "gu" ? "સત્તાવાર સંદર્ભ" : "Official References";
  const conditionsTitle = input.language === "gu" ? "શરતો અને નોંધો" : "Conditions and Notes";

  switch (input.responseKind) {
    case "schedule":
      return [
        {
          type: "timeline",
          title: input.language === "gu" ? "મહત્વપૂર્ણ તારીખો" : "Important Dates",
          items: extractTimelineItems(input.retrieval.documents, input.language),
        },
        {
          type: "checklist",
          title: input.language === "gu" ? "આગળની કાર્યવાહી" : "Required Actions",
          items: buildOperationalChecklist(
            input.responseKind,
            input.courseLabel,
            input.language,
            input.recommendations,
          ),
        },
        {
          type: "note",
          title: conditionsTitle,
          content: buildAdvisoryNote(input.retrieval, input.language, input.recommendations),
        },
      ] satisfies ChatSection[];

    case "documents":
      return [
        {
          type: "checklist",
          title: input.language === "gu" ? "દસ્તાવેજ ચેકલિસ્ટ" : "Document Checklist",
          items: buildOperationalChecklist(
            input.responseKind,
            input.courseLabel,
            input.language,
            input.recommendations,
          ),
        },
        {
          type: "list",
          title: sourceSectionTitle,
          items: referenceItems,
        },
        {
          type: "note",
          title: conditionsTitle,
          content: buildAdvisoryNote(input.retrieval, input.language, input.recommendations),
        },
      ] satisfies ChatSection[];

    case "eligibility":
    case "process":
      return [
        {
          type: "checklist",
          title: input.language === "gu" ? "ચકાસણી બિંદુઓ" : "Verification Checklist",
          items: buildOperationalChecklist(
            input.responseKind,
            input.courseLabel,
            input.language,
            input.recommendations,
          ),
        },
        {
          type: "list",
          title: sourceSectionTitle,
          items: referenceItems,
        },
        {
          type: "note",
          title: conditionsTitle,
          content: buildAdvisoryNote(input.retrieval, input.language, input.recommendations),
        },
      ] satisfies ChatSection[];

    case "cutoff": {
      const cutoffItems = input.retrieval.cutoffSummaries.slice(0, 5);

      return [
        cutoffItems.length > 0
          ? {
              type: "list",
              title: input.language === "gu" ? "ક્લોઝર સંકેતો" : "Closure Signals",
              items: cutoffItems,
            }
          : {
              type: "list",
              title: sourceSectionTitle,
              items: referenceItems,
            },
        {
          type: "note",
          title: input.language === "gu" ? "સાવચેતીઓ" : "Cautions",
          content: buildAdvisoryNote(input.retrieval, input.language, input.recommendations),
        },
      ] satisfies ChatSection[];
    }

    case "contact":
      return [
        {
          type: "list",
          title: input.language === "gu" ? "સત્તાવાર સંપર્ક" : "Official Contact",
          items: [...input.retrieval.advisories],
        },
        {
          type: "note",
          title: conditionsTitle,
          content:
            input.language === "gu"
              ? "સક્રિય પ્રવેશ સમયગાળામાં હંમેશા સત્તાવાર પોર્ટલ અને હેલ્પડેસ્કનો જ ઉપયોગ કરો."
              : "Use the official portal and helpdesk during active admission windows.",
        },
      ] satisfies ChatSection[];

    case "recommendation": {
      const options = buildOptionsSection(input.recommendations, input.language);

      if (options.length === 0) {
        return [
          {
            type: "checklist",
            title: input.language === "gu" ? "જરૂરી પ્રોફાઇલ ઇનપુટ" : "Profile Inputs Required",
            items: buildOperationalChecklist(
              input.responseKind,
              input.courseLabel,
              input.language,
              input.recommendations,
            ),
          },
          {
            type: "note",
            title: input.language === "gu" ? "સાવચેતીઓ" : "Cautions",
            content: buildAdvisoryNote(input.retrieval, input.language, input.recommendations),
          },
        ] satisfies ChatSection[];
      }

      return [
        {
          type: "options",
          title: input.language === "gu" ? "સૂચવાયેલા વિકલ્પો" : "Suggested Options",
          items: options,
        },
        {
          type: "checklist",
          title: input.language === "gu" ? "આગળની કાર્યવાહી" : "Required Actions",
          items: buildOperationalChecklist(
            input.responseKind,
            input.courseLabel,
            input.language,
            input.recommendations,
          ),
        },
        {
          type: "note",
          title: input.language === "gu" ? "સાવચેતીઓ" : "Cautions",
          content: buildAdvisoryNote(input.retrieval, input.language, input.recommendations),
        },
      ] satisfies ChatSection[];
    }

    default:
      return [
        {
          type: "list",
          title: sourceSectionTitle,
          items: referenceItems,
        },
        {
          type: "checklist",
          title: input.language === "gu" ? "આગળની કાર્યવાહી" : "Required Actions",
          items: buildOperationalChecklist(
            input.responseKind,
            input.courseLabel,
            input.language,
            input.recommendations,
          ),
        },
        {
          type: "note",
          title: conditionsTitle,
          content: buildAdvisoryNote(input.retrieval, input.language, input.recommendations),
        },
      ] satisfies ChatSection[];
  }
}

export function classifyQuestion(
  message: string,
  studentProfile?: ChatRequest["studentProfile"],
): ChatResponseKind {
  const normalized = normalizeForSearch(`${message} ${JSON.stringify(studentProfile ?? {})}`);

  if (hasKeyword(normalized, QUESTION_KEYWORDS.contact)) {
    return "contact";
  }

  if (hasKeyword(normalized, QUESTION_KEYWORDS.recommendation)) {
    return "recommendation";
  }

  if (hasKeyword(normalized, QUESTION_KEYWORDS.cutoff)) {
    return "cutoff";
  }

  if (hasKeyword(normalized, QUESTION_KEYWORDS.schedule)) {
    return "schedule";
  }

  if (hasKeyword(normalized, QUESTION_KEYWORDS.documents)) {
    return "documents";
  }

  if (hasKeyword(normalized, QUESTION_KEYWORDS.eligibility)) {
    return "eligibility";
  }

  if (hasKeyword(normalized, QUESTION_KEYWORDS.process)) {
    return "process";
  }

  return studentProfile?.meritRank ? "recommendation" : "general";
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
  const sources = buildSourceReferences(input.retrieval.documents);
  const sections = buildSections({
    responseKind: input.responseKind,
    language: input.language,
    courseLabel,
    retrieval: {
      ...input.retrieval,
      advisories: [...input.retrieval.advisories, ...(input.extraNotes ?? [])],
    },
    recommendations: input.recommendations,
  });

  return {
    language: input.language,
    deliveryMode: "fallback",
    selectedCourse: courseCode,
    responseKind: input.responseKind,
    title: buildTitle(input.responseKind, courseLabel, input.language),
    summary: buildSummary({
      courseLabel,
      responseKind: input.responseKind,
      language: input.language,
      retrieval: input.retrieval,
      recommendations: input.recommendations,
    }),
    sections,
    sources,
    suggestions: buildLocalizedSuggestions(input.language),
  } satisfies ChatResponse;
}

function normalizeOptionItem(value: unknown): ChatOptionItem | null {
  if (typeof value === "string") {
    const label = value.trim();
    return label ? { label } : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const label = normalizeString(input.label);
  const detail = normalizeString(input.detail);
  const meta = normalizeStringArray(input.meta);
  const bucket = normalizeString(input.bucket);

  if (!label) {
    return null;
  }

  return {
    label,
    detail: detail || undefined,
    meta: meta.length > 0 ? meta : undefined,
    bucket:
      bucket === "safe" || bucket === "competitive" || bucket === "ambitious"
        ? bucket
        : undefined,
  };
}

function normalizeSection(value: unknown): ChatSection | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const rawType = normalizeString(input.type);
  const title = normalizeString(input.title) || "Section";

  if (rawType === "note") {
    const content =
      normalizeString(input.content) || normalizeStringArray(input.items).join(" ");
    return content ? { type: "note", title, content } : null;
  }

  if (rawType === "options") {
    const items = Array.isArray(input.items)
      ? input.items.map((item) => normalizeOptionItem(item)).filter(Boolean)
      : [];

    return items.length > 0
      ? {
          type: "options",
          title,
          items: items as ChatOptionItem[],
        }
      : null;
  }

  const items = normalizeStringArray(input.items);

  if (items.length === 0) {
    return null;
  }

  if (rawType === "timeline" || rawType === "checklist" || rawType === "list") {
    return {
      type: rawType,
      title,
      items,
    };
  }

  return {
    type: "list",
    title,
    items,
  };
}

export function normalizeModelResponse(raw: unknown, fallback: ChatResponse): ChatResponse {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const input = raw as Record<string, unknown>;
  const title = normalizeString(input.title) || fallback.title;
  const summary = normalizeString(input.summary) || fallback.summary;
  const sections = Array.isArray(input.sections)
    ? input.sections.map((section) => normalizeSection(section)).filter(Boolean)
    : [];
  const suggestions = normalizeStringArray(input.suggestions).slice(0, 4);

  if (fallback.responseKind === "schedule") {
    return {
      ...fallback,
      deliveryMode: "grounded",
      title,
      summary,
      suggestions: suggestions.length > 0 ? suggestions : fallback.suggestions,
    };
  }

  if (sections.length < Math.min(2, fallback.sections.length)) {
    return {
      ...fallback,
      deliveryMode: "grounded",
      title,
      summary,
      suggestions: suggestions.length > 0 ? suggestions : fallback.suggestions,
    };
  }

  return {
    ...fallback,
    deliveryMode: "grounded",
    title,
    summary,
    sections: sections as ChatSection[],
    suggestions: suggestions.length > 0 ? suggestions : fallback.suggestions,
  };
}
