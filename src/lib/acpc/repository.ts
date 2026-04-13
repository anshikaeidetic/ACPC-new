import { COURSE_DEFINITIONS, getCourseDefinition } from "@/lib/acpc/course-definitions";
import { ACPC_DATASET } from "@/lib/acpc/dataset";
import { CourseCode } from "@/lib/acpc/types";

export function getDataset() {
  return ACPC_DATASET;
}

export function getCourses() {
  return COURSE_DEFINITIONS.map((course) => {
    const docs = ACPC_DATASET.sourceDocuments.filter(
      (document) => document.courseCode === course.code,
    );
    const cutoffCount = ACPC_DATASET.cutoffRecords.filter(
      (record) => record.courseCode === course.code,
    ).length;
    const seatCount = ACPC_DATASET.seatRecords.filter(
      (record) => record.courseCode === course.code,
    ).length;

    return {
      ...course,
      dataStatus: cutoffCount > 0 || seatCount > 0 ? "grounded" : "limited",
      sourceDocumentCount: docs.length,
      cutoffCount,
      seatCount,
    };
  });
}

export function getCourseDetail(courseCode: CourseCode) {
  const course = getCourseDefinition(courseCode);

  if (!course) {
    return undefined;
  }

  return {
    ...course,
    notices: ACPC_DATASET.notices
      .filter((notice) => notice.courseCode === courseCode)
      .slice(0, 8),
    documents: ACPC_DATASET.sourceDocuments
      .filter((document) => document.courseCode === courseCode)
      .slice(0, 12),
  };
}

export function getHomeHighlights() {
  const latestNotices = [...ACPC_DATASET.notices]
    .sort((left, right) => (right.issuedOn ?? "").localeCompare(left.issuedOn ?? ""))
    .slice(0, 6);

  const keyDates = [...ACPC_DATASET.sourceDocuments]
    .filter((document) => document.kind === "key-date")
    .sort((left, right) => (right.issuedOn ?? "").localeCompare(left.issuedOn ?? ""))
    .slice(0, 6);

  return {
    latestNotices,
    keyDates,
    courseCoverage: getCourses(),
    contact: ACPC_DATASET.contact,
  };
}
