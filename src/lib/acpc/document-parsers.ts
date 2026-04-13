import { CourseCode, CutoffRecord, DocumentKind, SeatRecord } from "@/lib/acpc/types";

const CATEGORY_TOKENS = [
  "GEN",
  "OPEN",
  "OP",
  "EWS",
  "SEBC",
  "SC",
  "ST",
  "TFWS",
  "TFW",
  "PWD",
  "PH",
  "DEF",
];

const BOARD_PATTERNS = [
  "GUJCET Based",
  "JEE Based",
  "NATA Based",
  "CMAT Based",
  "CAT Based",
  "GATE Based",
  "PGCET Based",
  "GPAT Based",
  "NEET Based",
  "Diploma Based",
  "Merit Based",
];

const INSTITUTE_TYPES = ["GOVT", "GIA", "Self-Fin", "SFI", "Grant In Aid", "Unaided"];

const INSTITUTE_KEYWORDS = [
  "COLLEGE",
  "UNIVERSITY",
  "INSTITUTE",
  "FACULTY",
  "SCHOOL",
  "ACADEMY",
  "CAMPUS",
  "GOVERNMENT",
  "VIDHYALAYA",
];

const PROGRAM_KEYWORDS = [
  "ENGINEERING",
  "PHARMACY",
  "ARCH",
  "ARCHITECTURE",
  "PLANNING",
  "DESIGN",
  "TECHNOLOGY",
  "MANAGEMENT",
  "COMPUTER",
  "CIVIL",
  "MECHANICAL",
  "ELECTRICAL",
  "INFORMATION",
  "COMMUNICATION",
  "ELECTRONICS",
  "CHEMICAL",
  "AUTOMOBILE",
  "AERONAUTICAL",
  "ARTIFICIAL",
  "MACHINE LEARNING",
  "BIOTECHNOLOGY",
  "INTERIOR",
  "MCA",
  "MBA",
];

const CITY_TOKENS = [
  "AHMEDABAD",
  "GANDHINAGAR",
  "VADODARA",
  "SURAT",
  "RAJKOT",
  "NADIAD",
  "V.V.NAGAR",
  "CHANGA",
  "BHAVNAGAR",
  "JUNAGADH",
  "ANAND",
  "PATAN",
  "MEHSANA",
  "HIMMATNAGAR",
  "NAVSARI",
  "MORBI",
  "JAMNAGAR",
  "BHUJ",
  "BHARUCH",
  "AMRELI",
  "MODASA",
];

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function extractIssuedOn(title: string) {
  const match = title.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!match) {
    return undefined;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function inferDocumentKind(title: string): DocumentKind {
  const normalized = title.toLowerCase();

  if (normalized.includes("key date")) {
    return "key-date";
  }

  if (normalized.includes("brochure")) {
    return "brochure";
  }

  if (normalized.includes("general instruction")) {
    return "general-instruction";
  }

  if (normalized.includes("guideline") || normalized.includes("instruction")) {
    return "guideline";
  }

  if (
    normalized.includes("closure") ||
    normalized.includes("last admitted rank") ||
    normalized.includes("merit list")
  ) {
    return "cutoff";
  }

  if (
    normalized.includes("vacant") ||
    normalized.includes("seat") ||
    normalized.includes("intake") ||
    normalized.includes("allotted")
  ) {
    return "seat";
  }

  if (normalized.includes("help")) {
    return "help";
  }

  return "notice";
}

function isHeaderLine(line: string) {
  return (
    !line ||
    line.startsWith("Admission Committee for Professional Courses") ||
    line.startsWith("First Year Degree Engineering") ||
    line.startsWith("Rank Wise Closure") ||
    line.startsWith("Inst_Name") ||
    line.startsWith("Institute closing") ||
    /^-- \d+ of \d+ --$/.test(line)
  );
}

export function splitPdfRows(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !isHeaderLine(line));

  const rows: string[] = [];
  let buffer: string[] = [];

  for (const line of lines) {
    buffer.push(line);

    if (/\d+\.\d+$/.test(line)) {
      rows.push(buffer.join("\n"));
      buffer = [];
    }
  }

  return rows;
}

function pickProgramStartIndex(lines: string[]) {
  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].toUpperCase();
    const programScore = PROGRAM_KEYWORDS.filter((keyword) => line.includes(keyword)).length;
    const instituteScore = INSTITUTE_KEYWORDS.filter((keyword) => line.includes(keyword)).length;
    const score = programScore * 3 - instituteScore * 2;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore > 0 ? bestIndex : -1;
}

function splitInlineInstituteAndProgram(text: string) {
  const normalized = normalizeWhitespace(text);

  for (const city of CITY_TOKENS) {
    const cityIndex = normalized.toUpperCase().lastIndexOf(city);

    if (cityIndex > -1) {
      const splitAt = cityIndex + city.length;
      return {
        instituteName: normalized.slice(0, splitAt).replace(/\s+,/g, ",").trim(),
        programName: normalized.slice(splitAt).trim(),
      };
    }
  }

  const candidateIndices = PROGRAM_KEYWORDS.map((keyword) =>
    normalized.toUpperCase().indexOf(keyword),
  ).filter((index) => index > 0);

  if (candidateIndices.length > 0) {
    const splitAt = Math.min(...candidateIndices);
    return {
      instituteName: normalized.slice(0, splitAt).trim(),
      programName: normalized.slice(splitAt).trim(),
    };
  }

  return {
    instituteName: normalized,
    programName: normalized,
  };
}

function normalizeInstituteType(value: string) {
  if (value === "SFI" || value === "Self-Fin") {
    return "Self-Financed";
  }

  if (value === "GOVT") {
    return "Government";
  }

  if (value === "GIA" || value === "Grant In Aid") {
    return "Grant-in-Aid";
  }

  return value;
}

export function parseCutoffRow(
  row: string,
  context: {
    courseCode: CourseCode;
    session: string;
    roundLabel: string;
    sourceDocumentId: string;
    sourceTitle: string;
    sourceUrl: string;
    recordId: string;
  },
): CutoffRecord | null {
  const normalizedRow = row.replace(/[\u2013\u2014]/g, "-");
  const closingMatch = normalizedRow.match(/(\d+(?:\.\d+))\s*$/);

  if (!closingMatch?.[1]) {
    return null;
  }

  const closingRank = Number.parseFloat(closingMatch[1]);
  const rowWithoutClosing = normalizedRow.slice(0, closingMatch.index).trim();
  const instituteType = [...INSTITUTE_TYPES].find((value) =>
    rowWithoutClosing.endsWith(` ${value}`),
  );

  if (!instituteType) {
    return null;
  }

  const rowWithoutType = rowWithoutClosing.slice(0, -(` ${instituteType}`.length)).trim();
  const board = [...BOARD_PATTERNS].find((value) => rowWithoutType.endsWith(` ${value}`));

  if (!board) {
    return null;
  }

  const rowWithoutBoard = rowWithoutType.slice(0, -(` ${board}`.length)).trim();
  const category = [...CATEGORY_TOKENS].find((value) => rowWithoutBoard.endsWith(` ${value}`));

  if (!category) {
    return null;
  }

  const prefix = rowWithoutBoard.slice(0, -(` ${category}`.length)).trim();
  const contentLines = prefix
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  let instituteName = "";
  let programName = "";

  if (contentLines.length > 1) {
    const programStartIndex = pickProgramStartIndex(contentLines);

    if (programStartIndex > 0) {
      instituteName = contentLines.slice(0, programStartIndex).join(" ");
      programName = contentLines.slice(programStartIndex).join(" ");
    } else {
      instituteName = contentLines.slice(0, -1).join(" ");
      programName = contentLines.at(-1) ?? "";
    }
  } else {
    const split = splitInlineInstituteAndProgram(contentLines[0] ?? prefix);
    instituteName = split.instituteName;
    programName = split.programName;
  }

  const combinedLabel = normalizeWhitespace(`${instituteName} ${programName}`);

  return {
    id: context.recordId,
    courseCode: context.courseCode,
    session: context.session,
    roundLabel: context.roundLabel,
    sourceDocumentId: context.sourceDocumentId,
    sourceTitle: context.sourceTitle,
    sourceUrl: context.sourceUrl,
    instituteName: normalizeWhitespace(instituteName),
    programName: normalizeWhitespace(programName),
    combinedLabel,
    category,
    board,
    instituteType: normalizeInstituteType(instituteType),
    closingRank,
  };
}

export function parseSeatRows(
  text: string,
  context: {
    courseCode: CourseCode;
    session: string;
    sourceDocumentId: string;
    sourceTitle: string;
    sourceUrl: string;
  },
) {
  const lines = text
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .filter((line) => !isHeaderLine(line));

  const records: SeatRecord[] = [];

  for (const line of lines) {
    const countMatch = line.match(/(\d+)\s*$/);

    if (!countMatch) {
      continue;
    }

    const label = line.slice(0, countMatch.index).trim();

    if (label.length < 12) {
      continue;
    }

    const split = splitInlineInstituteAndProgram(label);

    records.push({
      id: `${context.sourceDocumentId}-seat-${records.length + 1}`,
      courseCode: context.courseCode,
      session: context.session,
      sourceDocumentId: context.sourceDocumentId,
      sourceTitle: context.sourceTitle,
      sourceUrl: context.sourceUrl,
      combinedLabel: label,
      instituteName:
        split.instituteName !== split.programName ? split.instituteName : undefined,
      programName:
        split.instituteName !== split.programName ? split.programName : undefined,
      seatCount: Number.parseInt(countMatch[1], 10),
    });

    if (records.length >= 120) {
      break;
    }
  }

  return records;
}
