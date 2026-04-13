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

export interface TimelineSection {
  type: "timeline";
  title: string;
  items: string[];
}

export interface ListSection {
  type: "list";
  title: string;
  items: string[];
}

export interface ChecklistSection {
  type: "checklist";
  title: string;
  items: string[];
}

export interface NoteSection {
  type: "note";
  title: string;
  content: string;
}

export interface ChatOptionItem {
  label: string;
  detail?: string;
  meta?: string[];
  bucket?: RecommendationOption["bucket"];
}

export interface OptionsSection {
  type: "options";
  title: string;
  items: ChatOptionItem[];
}

export type ChatSection =
  | TimelineSection
  | ListSection
  | ChecklistSection
  | NoteSection
  | OptionsSection;

export interface ChatResponse {
  language: SupportedLanguage;
  deliveryMode: "grounded" | "fallback";
  selectedCourse?: CourseCode;
  responseKind: ChatResponseKind;
  title: string;
  summary: string;
  sections: ChatSection[];
  sources: SourceReference[];
  suggestions: string[];
}
