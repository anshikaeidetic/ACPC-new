import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFallbackChatResponse,
  classifyQuestion,
  hasMojibake,
  normalizeModelResponse,
} from "@/lib/acpc/chat-response";
import { retrieveGroundedContext } from "@/lib/acpc/retrieval";

test("classifyQuestion identifies schedule queries", () => {
  assert.equal(
    classifyQuestion("What are the latest key dates for degree engineering admission?"),
    "schedule",
  );
});

test("classifyQuestion identifies Gujarati schedule queries", () => {
  assert.equal(classifyQuestion("ડિગ્રી એન્જિનિયરિંગ માટે હાલની સત્તાવાર તારીખો શું છે?"), "schedule");
});

test("buildFallbackChatResponse preserves readable Gujarati text", () => {
  const retrieval = retrieveGroundedContext({
    message: "ડિગ્રી એન્જિનિયરિંગ માટે હાલની સત્તાવાર તારીખો શું છે?",
    selectedCourse: "degree-engineering",
    responseKind: "schedule",
  });

  const response = buildFallbackChatResponse({
    language: "gu",
    selectedCourse: "degree-engineering",
    responseKind: "schedule",
    retrieval,
  });

  assert.equal(hasMojibake(JSON.stringify(response)), false);
  assert.equal(typeof response.answer, "string");
  assert.ok(response.answer.length > 20);
});

test("normalizeModelResponse coerces natural answer payload safely", () => {
  const retrieval = retrieveGroundedContext({
    message: "Explain the latest key dates for degree engineering admission.",
    selectedCourse: "degree-engineering",
    responseKind: "schedule",
  });

  const fallback = buildFallbackChatResponse({
    language: "en",
    selectedCourse: "degree-engineering",
    responseKind: "schedule",
    retrieval,
  });

  const normalized = normalizeModelResponse(
    {
      answer:
        "The current ACPC key-date notice shows registration closing on 31 May 2026, provisional merit on 12 June 2026, and final merit on 17 June 2026.",
      highlights:
        "31 May 2026: registration closes; 12 June 2026: provisional merit; 17 June 2026: final merit",
      suggestions: "List the documents I should keep ready.; Explain mock round choice filling.",
    },
    fallback,
  );

  assert.equal(normalized.deliveryMode, "grounded");
  assert.match(normalized.answer, /31 May 2026/);
  assert.ok(normalized.highlights.length >= 1);
  assert.deepEqual(normalized.suggestions, [
    "List the documents I should keep ready.",
    "Explain mock round choice filling.",
  ]);
});
