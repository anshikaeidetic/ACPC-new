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
  assert.ok(response.sections.length >= 2);
});

test("normalizeModelResponse coerces structured strings safely", () => {
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
      title: "Degree Engineering official timeline",
      summary: "This note uses the current official ACPC schedule.",
      sections: [
        {
          type: "checklist",
          title: "Required Actions",
          items: "Review the key dates. Keep documents ready.",
        },
        {
          type: "note",
          title: "Conditions",
          content: "Verify the official portal before locking final choices.",
        },
      ],
      suggestions: "Check documents. Compare rank options.",
    },
    fallback,
  );

  assert.equal(normalized.deliveryMode, "grounded");
  assert.equal(normalized.sections[0]?.type, "timeline");
  assert.equal(normalized.title, "Degree Engineering official timeline");
  assert.equal(normalized.summary, "This note uses the current official ACPC schedule.");

  assert.deepEqual(normalized.suggestions, [
    "Check documents",
    "Compare rank options.",
  ]);
});
