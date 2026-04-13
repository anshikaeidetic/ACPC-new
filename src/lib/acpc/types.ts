export type SupportedLanguage = "en" | "gu";

export type CourseCode =
  | "degree-engineering"
  | "pharmacy"
  | "ddcet"
  | "diploma-to-degree"
  | "me-mtech"
  | "mpharma"
  | "mba-mca"
  | "mba-coe"
  | "b-arch"
  | "m-arch"
  | "b-plan"
  | "m-plan"
  | "bid-bct";

export type DocumentKind =
  | "key-date"
  | "guideline"
  | "brochure"
  | "general-instruction"
  | "notice"
  | "cutoff"
  | "seat"
  | "help"
  | "contact"
  | "status";

export interface CourseDefinition {
  code: CourseCode;
  label: string;
  shortLabel: string;
  slug: string;
  officialTitle: string;
  description: string;
  counselingFocus: string;
  supportTags: string[];
  preferredInputs: string[];
}

export interface SourceDocument {
  id: string;
  courseCode: CourseCode;
  title: string;
  url: string;
  kind: DocumentKind;
  session: string;
  issuedOn?: string;
  summary: string;
  snippet: string;
  keywords: string[];
}

export interface NoticeRecord {
  id: string;
  courseCode: CourseCode;
  title: string;
  url: string;
  issuedOn?: string;
  summary: string;
  status: "active" | "archive";
}

export interface CutoffRecord {
  id: string;
  courseCode: CourseCode;
  session: string;
  roundLabel: string;
  sourceDocumentId: string;
  sourceTitle: string;
  sourceUrl: string;
  instituteName: string;
  programName: string;
  combinedLabel: string;
  category: string;
  board: string;
  instituteType: string;
  closingRank: number;
}

export interface SeatRecord {
  id: string;
  courseCode: CourseCode;
  session: string;
  sourceDocumentId: string;
  sourceTitle: string;
  sourceUrl: string;
  combinedLabel: string;
  instituteName?: string;
  programName?: string;
  instituteType?: string;
  seatCount?: number;
  statusLabel?: string;
}

export interface ContactDetails {
  office: string;
  address: string[];
  phone: string;
  fax?: string;
  email: string;
  url: string;
}

export interface AcpcDataset {
  generatedAt: string;
  session: string;
  contact: ContactDetails;
  courses: CourseDefinition[];
  sourceDocuments: SourceDocument[];
  notices: NoticeRecord[];
  cutoffRecords: CutoffRecord[];
  seatRecords: SeatRecord[];
}

export interface StudentProfile {
  courseCode: CourseCode;
  meritRank?: number;
  category?: string;
  preferredBranches?: string[];
  preferredLocations?: string[];
  instituteTypes?: string[];
  budgetSensitivity?: "low" | "medium" | "high";
  language?: SupportedLanguage;
  notes?: string;
}

export interface RecommendationOption {
  id: string;
  bucket: "safe" | "competitive" | "ambitious";
  instituteName: string;
  programName: string;
  combinedLabel: string;
  rationale: string;
  closingRank?: number;
  category: string;
  board: string;
  instituteType: string;
  sourceTitle: string;
  sourceUrl: string;
  matchScore: number;
}

export interface RecommendationResult {
  courseCode: CourseCode;
  generatedAt: string;
  dataAvailability: "grounded" | "limited";
  summary: string;
  warnings: string[];
  safeOptions: RecommendationOption[];
  competitiveOptions: RecommendationOption[];
  ambitiousOptions: RecommendationOption[];
  nextSteps: string[];
  sourceReferences: Array<{
    title: string;
    url: string;
  }>;
}

export interface ChatRequest {
  message: string;
  selectedCourse?: CourseCode;
  language?: SupportedLanguage;
  studentProfile?: Partial<StudentProfile>;
}

export type ChatResponseKind =
  | "general"
  | "schedule"
  | "eligibility"
  | "documents"
  | "process"
  | "cutoff"
  | "contact"
  | "recommendation";

export interface SourceReference {
  title: string;
  url: string;
  kind: DocumentKind;
  issuedOn?: string;
}

export interface ChatResponse {
  language: SupportedLanguage;
  deliveryMode: "grounded" | "fallback";
  selectedCourse?: CourseCode;
  responseKind: ChatResponseKind;
  answer: string;
  highlights: string[];
  sources: SourceReference[];
  suggestions: string[];
}
