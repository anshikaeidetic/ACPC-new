import { CourseCode, CourseDefinition } from "@/lib/acpc/types";

export const COURSE_DEFINITIONS: CourseDefinition[] = [
  {
    code: "degree-engineering",
    label: "Degree Engineering",
    shortLabel: "BE / B.Tech",
    slug: "be-b-tech",
    officialTitle: "BE/B.TECH",
    description:
      "First-year engineering admissions, branch exploration, rank-based closure review, and institute-level option planning.",
    counselingFocus:
      "Strongest data coverage with rank-wise closure and intake reports.",
    supportTags: ["GUJCET", "JEE", "choice filling", "closure rank", "seat allotment"],
    preferredInputs: ["Merit rank", "Category", "Branch interest", "Institute type"],
  },
  {
    code: "pharmacy",
    label: "Degree / Diploma Pharmacy",
    shortLabel: "Pharmacy",
    slug: "pharmacy",
    officialTitle: "Pharmacy",
    description:
      "Degree and diploma pharmacy admission guidance with official timelines, first-round closure analysis, and reporting support.",
    counselingFocus:
      "Official round analysis is available; recommendations stay source-backed where closure data is present.",
    supportTags: ["degree pharmacy", "diploma pharmacy", "reporting", "seat status"],
    preferredInputs: ["Merit rank", "Category", "Location preference"],
  },
  {
    code: "ddcet",
    label: "DDCET",
    shortLabel: "DDCET",
    slug: "ddcet",
    officialTitle: "DDCET",
    description:
      "DDCET engineering and pharmacy exam support with current key dates, instructions, and next-step guidance.",
    counselingFocus:
      "Exam and process guidance first; recommendation depth depends on official closure records exposed on the portal.",
    supportTags: ["DDCET", "diploma admission", "engineering", "pharmacy"],
    preferredInputs: ["Exam status", "Preferred stream", "Category"],
  },
  {
    code: "diploma-to-degree",
    label: "Diploma to Degree",
    shortLabel: "Diploma to Degree",
    slug: "diploma",
    officialTitle: "Diploma to Degree",
    description:
      "Lateral-entry engineering and pharmacy counseling with closure, vacant seat, and confirmation guidance.",
    counselingFocus:
      "Round-based closure and vacant seat documents available for grounded lateral-entry suggestions.",
    supportTags: ["lateral entry", "D to D", "vacant seats", "confirmation"],
    preferredInputs: ["Diploma rank", "Category", "Branch preference"],
  },
  {
    code: "me-mtech",
    label: "ME / M.Tech",
    shortLabel: "ME / M.Tech",
    slug: "me-mtech",
    officialTitle: "ME/MTech",
    description:
      "Postgraduate engineering admission support with source monitoring for updates and official process navigation.",
    counselingFocus:
      "Structured support is available, but recommendation depth depends on active official publications.",
    supportTags: ["postgraduate", "GATE", "merit", "round status"],
    preferredInputs: ["Preferred specialization", "Institute type", "Exam status"],
  },
  {
    code: "mpharma",
    label: "M.Pharm",
    shortLabel: "M.Pharm",
    slug: "mpharma",
    officialTitle: "MPharma",
    description:
      "M.Pharm admissions with vacant-seat updates, closure tracking, and institute-level opportunity review.",
    counselingFocus:
      "Grounded seat and closure coverage from recent official vacant-seat rounds.",
    supportTags: ["vacant seats", "round closure", "government institute", "SFI"],
    preferredInputs: ["Merit rank", "Institute type", "Location"],
  },
  {
    code: "mba-mca",
    label: "MBA / MCA",
    shortLabel: "MBA / MCA",
    slug: "mba-mca",
    officialTitle: "MBA/MCA",
    description:
      "Management and MCA admissions support covering process, scheduling, documentation, and official updates.",
    counselingFocus:
      "Supports process guidance now; recommendation depth expands as official closure data becomes available.",
    supportTags: ["MBA", "MCA", "CMAT", "choice filling"],
    preferredInputs: ["Program", "Exam status", "Preferred city"],
  },
  {
    code: "mba-coe",
    label: "MBA-CoE",
    shortLabel: "MBA-CoE",
    slug: "mba-coe",
    officialTitle: "MBA-CoE",
    description:
      "Council of entrepreneurship MBA process support with official notices and checklist-style next steps.",
    counselingFocus:
      "Grounded on official instructions first, with advisory support kept clearly separate.",
    supportTags: ["MBA-CoE", "eligibility", "process", "helpdesk"],
    preferredInputs: ["Program interest", "City preference"],
  },
  {
    code: "b-arch",
    label: "B.Arch",
    shortLabel: "B.Arch",
    slug: "b-arch",
    officialTitle: "B.Arch",
    description:
      "Architecture admission support with merit, vacancy, allotment, and NATA-oriented guidance.",
    counselingFocus:
      "Official vacancy and allotment reports enable grounded B.Arch guidance.",
    supportTags: ["NATA", "merit list", "vacancy", "offline counseling"],
    preferredInputs: ["NATA rank", "Category", "Institute type"],
  },
  {
    code: "m-arch",
    label: "M.Arch",
    shortLabel: "M.Arch",
    slug: "m-arch",
    officialTitle: "M.Arch",
    description:
      "Postgraduate architecture support with historical closure references and source-backed process guidance.",
    counselingFocus:
      "Uses the latest available official closure records and highlights when the source year differs from the current session.",
    supportTags: ["closure", "M.Arch", "postgraduate architecture"],
    preferredInputs: ["Merit rank", "Preferred institute"],
  },
  {
    code: "b-plan",
    label: "B.Plan",
    shortLabel: "B.Plan",
    slug: "b-plan",
    officialTitle: "B.Plan",
    description:
      "Planning admission support covering procedure, eligibility, and source-grounded student checklists.",
    counselingFocus:
      "Process guidance first; counseling depth increases when official closure data is refreshed.",
    supportTags: ["planning", "eligibility", "admission steps"],
    preferredInputs: ["Preferred city", "Institute type"],
  },
  {
    code: "m-plan",
    label: "M.Plan",
    shortLabel: "M.Plan",
    slug: "m-plan",
    officialTitle: "M.Plan",
    description:
      "Postgraduate planning guidance with historic closure references and current official notices.",
    counselingFocus:
      "Grounded on the latest published official closure record and current process documents.",
    supportTags: ["M.Plan", "closure", "postgraduate planning"],
    preferredInputs: ["Merit rank", "Preferred institute"],
  },
  {
    code: "bid-bct",
    label: "B.I.D & B.C.T",
    shortLabel: "B.I.D / B.C.T",
    slug: "b-i-d-b-c-t",
    officialTitle: "B.I.D & B.C.T",
    description:
      "Design and costume technology admission support with official notices, process steps, and verified contacts.",
    counselingFocus:
      "Official-process support now, with recommendation depth tied to available published records.",
    supportTags: ["design", "costume technology", "documents", "reporting"],
    preferredInputs: ["Program interest", "Location"],
  },
];

export const COURSE_ALIAS_MAP: Record<CourseCode, string[]> = {
  "degree-engineering": [
    "degree engineering",
    "b.tech",
    "btech",
    "be b.tech",
    "engineering admission",
    "gujcet",
    "jee",
  ],
  pharmacy: ["pharmacy", "b.pharm", "d.pharm"],
  ddcet: ["ddcet", "ddcet engineering", "ddcet pharmacy"],
  "diploma-to-degree": ["diploma to degree", "d to d", "lateral entry"],
  "me-mtech": ["mtech", "m.tech", "me mtech", "pg engineering"],
  mpharma: ["mpharma", "mpharm", "m.pharm"],
  "mba-mca": ["mba", "mca", "management"],
  "mba-coe": ["mba-coe", "coe", "entrepreneurship"],
  "b-arch": ["b.arch", "barch", "architecture", "nata"],
  "m-arch": ["m.arch", "march architecture"],
  "b-plan": ["b.plan", "bplan", "planning"],
  "m-plan": ["m.plan", "mplan"],
  "bid-bct": ["bid", "bct", "interior design", "costume technology"],
};

export function getCourseDefinition(courseCode: CourseCode) {
  return COURSE_DEFINITIONS.find((course) => course.code === courseCode);
}
