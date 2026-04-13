import { ACPC_DATASET } from "@/lib/acpc/dataset";
import { RecommendationOption, RecommendationResult, StudentProfile } from "@/lib/acpc/types";

function normalize(value: string) {
  return value.toLowerCase();
}

function buildLocationScore(instituteName: string, locations: string[]) {
  if (locations.length === 0) {
    return 0;
  }

  const normalizedInstitute = normalize(instituteName);
  return locations.some((location) => normalizedInstitute.includes(normalize(location))) ? 8 : 0;
}

function buildBranchScore(programName: string, preferredBranches: string[]) {
  if (preferredBranches.length === 0) {
    return 0;
  }

  const normalizedProgram = normalize(programName);
  return preferredBranches.some((branch) => normalizedProgram.includes(normalize(branch))) ? 12 : 0;
}

function buildInstituteTypeScore(instituteType: string, preferredTypes: string[]) {
  if (preferredTypes.length === 0) {
    return 0;
  }

  const normalizedType = normalize(instituteType);
  return preferredTypes.some((type) => normalizedType.includes(normalize(type))) ? 6 : 0;
}

function classifyBucket(userRank: number, closingRank: number) {
  if (userRank <= closingRank * 0.75) {
    return "safe" as const;
  }

  if (userRank <= closingRank * 1.05) {
    return "competitive" as const;
  }

  return "ambitious" as const;
}

function dedupeOptions(options: RecommendationOption[]) {
  return Array.from(
    new Map(options.map((option) => [`${option.instituteName}-${option.programName}`, option])).values(),
  );
}

function nextStepsForCourse(courseCode: StudentProfile["courseCode"]) {
  return [
    "Verify the latest key dates and reporting instructions before locking choices.",
    "Review institute-level documents and tuition details before final preference submission.",
    `Keep ${courseCode.replace(/-/g, " ")} options spread across safe, competitive, and ambitious bands.`,
  ];
}

export function buildRecommendations(profile: StudentProfile): RecommendationResult {
  const category = profile.category?.toUpperCase() ?? "OPEN";
  const preferredBranches = profile.preferredBranches ?? [];
  const preferredLocations = profile.preferredLocations ?? [];
  const preferredInstituteTypes = profile.instituteTypes ?? [];

  const candidateRecords = ACPC_DATASET.cutoffRecords.filter((record) => {
    return record.courseCode === profile.courseCode;
  });

  if (candidateRecords.length === 0 || !profile.meritRank) {
    return {
      courseCode: profile.courseCode,
      generatedAt: new Date().toISOString(),
      dataAvailability: "limited",
      summary:
        candidateRecords.length === 0
          ? "Official closure records are not currently synchronized for this course family."
          : "A merit rank is required to classify safe, competitive, and ambitious options.",
      warnings: [
        "Recommendations are limited to verified notices and process guidance until enough structured data is available.",
      ],
      safeOptions: [],
      competitiveOptions: [],
      ambitiousOptions: [],
      nextSteps: nextStepsForCourse(profile.courseCode),
      sourceReferences: ACPC_DATASET.sourceDocuments
        .filter((document) => document.courseCode === profile.courseCode)
        .slice(0, 4)
        .map((document) => ({ title: document.title, url: document.url })),
    };
  }

  const scoredOptions = candidateRecords
    .filter((record) => {
      if (record.category === category) {
        return true;
      }

      return category === "OPEN" && record.category === "GEN";
    })
    .map((record) => {
      const branchScore = buildBranchScore(record.programName, preferredBranches);
      const locationScore = buildLocationScore(record.instituteName, preferredLocations);
      const instituteTypeScore = buildInstituteTypeScore(record.instituteType, preferredInstituteTypes);
      const rankFit = Math.max(0, 24 - Math.abs(profile.meritRank! - record.closingRank) / 250);
      const matchScore = branchScore + locationScore + instituteTypeScore + rankFit;
      const bucket = classifyBucket(profile.meritRank!, record.closingRank);
      const rationaleParts = [
        `Closing rank in the synchronized official record is ${record.closingRank}.`,
        branchScore > 0 ? "Branch preference aligns with this option." : null,
        locationScore > 0 ? "Location preference aligns with this institute." : null,
        instituteTypeScore > 0 ? "Institute type matches the selected preference." : null,
      ].filter(Boolean);

      return {
        id: record.id,
        bucket,
        instituteName: record.instituteName,
        programName: record.programName,
        combinedLabel: record.combinedLabel,
        rationale: rationaleParts.join(" "),
        closingRank: record.closingRank,
        category: record.category,
        board: record.board,
        instituteType: record.instituteType,
        sourceTitle: record.sourceTitle,
        sourceUrl: record.sourceUrl,
        matchScore,
      } satisfies RecommendationOption;
    })
    .sort((left, right) => right.matchScore - left.matchScore);

  const deduped = dedupeOptions(scoredOptions);
  const safeOptions = deduped.filter((option) => option.bucket === "safe").slice(0, 5);
  const competitiveOptions = deduped
    .filter((option) => option.bucket === "competitive")
    .slice(0, 5);
  const ambitiousOptions = deduped.filter((option) => option.bucket === "ambitious").slice(0, 5);

  return {
    courseCode: profile.courseCode,
    generatedAt: new Date().toISOString(),
    dataAvailability: "grounded",
    summary:
      safeOptions.length + competitiveOptions.length + ambitiousOptions.length > 0
        ? "Recommendations are grouped using synchronized official closure records and your submitted profile."
        : "No matching options were found for the submitted filters in the synchronized official record set.",
    warnings: [
      "Previous-year closure patterns guide suitability; final allotment depends on the live merit sequence, category pool, and round dynamics.",
    ],
    safeOptions,
    competitiveOptions,
    ambitiousOptions,
    nextSteps: nextStepsForCourse(profile.courseCode),
    sourceReferences: deduped.slice(0, 6).map((option) => ({
      title: option.sourceTitle,
      url: option.sourceUrl,
    })),
  };
}
