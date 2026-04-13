import assert from "node:assert/strict";
import test from "node:test";

import { extractIssuedOn, inferDocumentKind, parseCutoffRow } from "@/lib/acpc/document-parsers";

test("extractIssuedOn parses dotted dates", () => {
  assert.equal(
    extractIssuedOn("31.03.2026 Key Dates for Degree Engineering Admission 2026-27"),
    "2026-03-31",
  );
});

test("inferDocumentKind identifies cutoff documents", () => {
  assert.equal(inferDocumentKind("Round 3 Analysis Closure Rank Wise"), "cutoff");
});

test("parseCutoffRow extracts structured cutoff fields", () => {
  const row =
    "L.D.COLLEGE OF ENGINEERING, AHMEDABAD COMPUTER ENGINEERING GEN GUJCET Based GOVT 646.00";

  const parsed = parseCutoffRow(row, {
    courseCode: "degree-engineering",
    session: "2026-27",
    roundLabel: "Historical round",
    sourceDocumentId: "source-1",
    sourceTitle: "Round 3 Analysis Closure Rank Wise",
    sourceUrl: "https://example.com/source.pdf",
    recordId: "cutoff-1",
  });

  assert.ok(parsed);
  assert.equal(parsed?.category, "GEN");
  assert.equal(parsed?.board, "GUJCET Based");
  assert.equal(parsed?.instituteType, "Government");
  assert.equal(parsed?.closingRank, 646);
});
