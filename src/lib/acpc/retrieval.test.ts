import assert from "node:assert/strict";
import test from "node:test";

import { detectCourseFromText, retrieveGroundedContext } from "@/lib/acpc/retrieval";

test("detectCourseFromText identifies engineering queries", () => {
  assert.equal(
    detectCourseFromText("What are the latest degree engineering key dates for Gujarat ACPC?"),
    "degree-engineering",
  );
});

test("retrieveGroundedContext returns a retrieval result object", () => {
  const result = retrieveGroundedContext({
    message: "Explain registration dates and documents for degree engineering admission.",
    selectedCourse: "degree-engineering",
    responseKind: "schedule",
  });

  assert.ok(Array.isArray(result.documents));
  assert.ok(Array.isArray(result.advisories));
  assert.equal(result.documents[0]?.kind, "key-date");
});

test("retrieveGroundedContext avoids unrelated generic notices for document queries", () => {
  const result = retrieveGroundedContext({
    message: "Which documents should I verify before registration?",
    selectedCourse: "degree-engineering",
    responseKind: "documents",
  });

  assert.equal(result.documents.some((document) => document.title === "List of Cyber Space Centers"), false);
});
