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
  });

  assert.ok(Array.isArray(result.documents));
  assert.ok(Array.isArray(result.advisories));
});
