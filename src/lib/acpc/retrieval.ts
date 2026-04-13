import { COURSE_ALIAS_MAP } from "@/lib/acpc/course-definitions";
import { ACPC_DATASET } from "@/lib/acpc/dataset";
import { ChatResponseKind, CourseCode, DocumentKind, SourceDocument, StudentProfile } from "@/lib/acpc/types";

const SUPPORT_TOKENS = {
  cutoff: ["cutoff", "closure", "rank", "admitted", "merit"],
  seat: ["vacant", "seat", "intake", "allotted", "vacancy"],
  contact: ["contact", "phone", "email", "helpline", "helpdesk"],
};

const KIND_PRIORITY: Record<ChatResponseKind, DocumentKind[]> = {
  general: ["key-date", "guideline", "general-instruction", "brochure", "notice"],
  schedule: ["key-date", "guideline", "general-instruction", "notice"],
  eligibility: ["guideline", "brochure", "general-instruction", "notice"],
  documents: ["brochure", "guideline", "general-instruction", "notice"],
  process: ["guideline", "general-instruction", "key-date", "brochure"],
  cutoff: ["cutoff", "seat", "guideline", "key-date"],
  contact: ["contact", "help", "notice", "guideline"],
  recommendation: ["cutoff", "seat", "guideline", "key-date"],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ");
}

function tokenize(value: string) {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function kindBoost(kind: DocumentKind, responseKind: ChatResponseKind) {
  const rank = KIND_PRIORITY[responseKind].indexOf(kind);

  if (rank === -1) {
    return 0;
  }

  return 36 - rank * 6;
}

function issuedOnScore(issuedOn?: string) {
  if (!issuedOn) {
    return 0;
  }

  return Number(issuedOn.replaceAll("-", "")) / 100_000_000;
}

export function detectCourseFromText(message: string) {
  const normalizedMessage = normalize(message);

  for (const [courseCode, aliases] of Object.entries(COURSE_ALIAS_MAP)) {
    if (aliases.some((alias) => normalizedMessage.includes(alias))) {
      return courseCode as CourseCode;
    }
  }

  return undefined;
}

function keywordScore(document: SourceDocument, tokens: string[]) {
  const haystack = normalize(
    `${document.title} ${document.summary} ${document.snippet} ${document.keywords.join(" ")}`,
  );

  return tokens.reduce((score, token) => {
    if (haystack.includes(token)) {
      return score + 4;
    }

    return score;
  }, 0);
}

function scoreDocument(
  document: SourceDocument,
  tokens: string[],
  responseKind: ChatResponseKind,
) {
  return keywordScore(document, tokens) + kindBoost(document.kind, responseKind) + issuedOnScore(document.issuedOn);
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export interface RetrievalResult {
  courseCode?: CourseCode;
  documents: SourceDocument[];
  cutoffSummaries: string[];
  seatSummaries: string[];
  advisories: string[];
}

export function retrieveGroundedContext(input: {
  message: string;
  selectedCourse?: CourseCode;
  studentProfile?: Partial<StudentProfile>;
  responseKind?: ChatResponseKind;
}): RetrievalResult {
  const inferredCourse = input.selectedCourse ?? detectCourseFromText(input.message);
  const profileText = JSON.stringify(input.studentProfile ?? {});
  const tokens = tokenize(`${input.message} ${profileText}`);
  const responseKind = input.responseKind ?? "general";

  const courseScopedDocuments = ACPC_DATASET.sourceDocuments.filter((document) => {
    if (!inferredCourse) {
      return true;
    }

    return document.courseCode === inferredCourse;
  });

  const scopedDocuments =
    courseScopedDocuments.length > 0 ? courseScopedDocuments : ACPC_DATASET.sourceDocuments;

  const sortedDocuments = scopedDocuments
    .map((document) => ({
      document,
      keywordScore: keywordScore(document, tokens),
      score: scoreDocument(document, tokens, responseKind),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.keywordScore - left.keywordScore ||
        issuedOnScore(right.document.issuedOn) - issuedOnScore(left.document.issuedOn),
    );

  const preferredKinds = KIND_PRIORITY[responseKind];
  const preferredDocuments = sortedDocuments
    .filter(({ document, keywordScore: currentKeywordScore }) => {
      if (!preferredKinds.includes(document.kind)) {
        return false;
      }

      if (document.kind === "notice" && currentKeywordScore === 0) {
        return false;
      }

      return true;
    })
    .map((entry) => entry.document)
    .sort((left, right) => {
      return (
        kindBoost(right.kind, responseKind) - kindBoost(left.kind, responseKind) ||
        issuedOnScore(right.issuedOn) - issuedOnScore(left.issuedOn)
      );
    });

  const relevantDocuments = sortedDocuments.filter(({ document, keywordScore: currentKeywordScore }) => {
    if (document.kind === "notice" && currentKeywordScore === 0) {
      return false;
    }

    return true;
  });

  const documents = uniqueById([
    ...relevantDocuments.slice(0, 5).map((entry) => entry.document),
    ...preferredDocuments.slice(0, 3),
  ])
    .filter((document) => document.snippet.length > 0)
    .slice(0, 6);

  const wantsCutoff = SUPPORT_TOKENS.cutoff.some((token) => tokens.includes(token));
  const wantsSeat = SUPPORT_TOKENS.seat.some((token) => tokens.includes(token));
  const wantsContact = SUPPORT_TOKENS.contact.some((token) => tokens.includes(token));

  const cutoffSummaries = ACPC_DATASET.cutoffRecords
    .filter((record) => !inferredCourse || record.courseCode === inferredCourse)
    .filter((record) => {
      if (!input.studentProfile?.preferredBranches?.length) {
        return true;
      }

      return input.studentProfile.preferredBranches.some((branch) =>
        normalize(record.programName).includes(normalize(branch)),
      );
    })
    .slice(0, wantsCutoff ? 14 : 6)
    .map((record) => {
      return `${record.instituteName} | ${record.programName} | ${record.category} | ${record.board} | ${record.instituteType} | closing rank ${record.closingRank}`;
    });

  const seatSummaries = ACPC_DATASET.seatRecords
    .filter((record) => !inferredCourse || record.courseCode === inferredCourse)
    .slice(0, wantsSeat ? 10 : 4)
    .map((record) => {
      const seatLabel =
        typeof record.seatCount === "number"
          ? `${record.seatCount} reported seats`
          : "seat status available";
      return `${record.combinedLabel} | ${seatLabel}`;
    });

  const advisories = [];

  if (wantsContact) {
    advisories.push(
      `Helpdesk: ${ACPC_DATASET.contact.phone} | ${ACPC_DATASET.contact.email} | ${ACPC_DATASET.contact.address.join(", ")}`,
    );
  }

  if (inferredCourse && cutoffSummaries.length === 0) {
    advisories.push(
      "No official closure dataset is currently synchronized for this course family. Keep recommendations limited to verified notices and guidance.",
    );
  }

  return {
    courseCode: inferredCourse,
    documents,
    cutoffSummaries,
    seatSummaries,
    advisories,
  };
}
