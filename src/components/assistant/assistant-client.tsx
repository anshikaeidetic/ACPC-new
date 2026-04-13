"use client";

import { useState } from "react";

import { COURSE_DEFINITIONS } from "@/lib/acpc/course-definitions";
import { ChatResponse, CourseCode, SupportedLanguage } from "@/lib/acpc/types";

const QUICK_PROMPTS = {
  en: [
    "What are the latest key dates for degree engineering admission?",
    "Explain the documents required for ACPC registration.",
    "What should I verify before final choice filling?",
  ],
  gu: [
    "Summarize the latest degree engineering key dates in Gujarati.",
    "Explain the required ACPC registration documents in Gujarati.",
    "List the final choice filling checks in Gujarati.",
  ],
} satisfies Record<SupportedLanguage, string[]>;

export function AssistantClient() {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [courseCode, setCourseCode] = useState<CourseCode>("degree-engineering");
  const [message, setMessage] = useState(QUICK_PROMPTS.en[0]);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitMessage(currentMessage: string) {
    setLoading(true);

    try {
      const apiResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
          selectedCourse: courseCode,
          language,
        }),
      });

      const payload = (await apiResponse.json()) as ChatResponse;
      setResponse(payload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--border-soft)] bg-white shadow-[0_24px_60px_rgba(16,42,67,0.12)]">
      <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-2xl font-bold text-[var(--ink-900)]">
            ACPC Admission Support
          </p>
          <p className="text-sm text-[var(--ink-500)]">
            Ask one question. Get one grounded response.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={courseCode}
            onChange={(event) => setCourseCode(event.target.value as CourseCode)}
            className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-base)] px-4 py-2 text-sm font-semibold text-[var(--ink-700)] outline-none"
          >
            {COURSE_DEFINITIONS.map((course) => (
              <option key={course.code} value={course.code}>
                {course.label}
              </option>
            ))}
          </select>

          <div className="flex rounded-full border border-[var(--border-soft)] bg-[var(--surface-base)] p-1">
            {(["en", "gu"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setLanguage(value);
                  setMessage(QUICK_PROMPTS[value][0]);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  language === value
                    ? "bg-[var(--surface-strong)] text-white"
                    : "text-[var(--ink-700)]"
                }`}
              >
                {value === "en" ? "English" : "Gujarati"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 md:px-6">
        <div className="min-h-[26rem] rounded-[1.6rem] bg-[#faf8f2] p-5">
          {response ? (
            <div className="space-y-5">
              <div className="rounded-[1.4rem] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--surface-accent)]">
                  Answer
                </p>
                <p className="mt-3 text-base leading-8 text-[var(--ink-700)]">
                  {response.directAnswer}
                </p>
              </div>

              {response.nextSteps.length > 0 ? (
                <div className="rounded-[1.4rem] bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--surface-accent)]">
                    Next Steps
                  </p>
                  <ul className="mt-3 grid gap-2 text-sm leading-7 text-[var(--ink-700)]">
                    {response.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {response.warnings.length > 0 ? (
                <div className="rounded-[1.4rem] bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--surface-accent)]">
                    Warnings
                  </p>
                  <ul className="mt-3 grid gap-2 text-sm leading-7 text-[var(--ink-700)]">
                    {response.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {response.sources.length > 0 ? (
                <div className="rounded-[1.4rem] bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--surface-accent)]">
                    Sources
                  </p>
                  <div className="mt-3 grid gap-3">
                    {response.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-[var(--ink-700)] underline decoration-[var(--surface-accent)] underline-offset-4"
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
              <p className="font-serif text-3xl font-bold text-[var(--ink-900)]">
                ACPC chat interface
              </p>
              <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--ink-500)]">
                Ask about dates, eligibility, registration, documents, reporting, or choice
                filling.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS[language].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setMessage(prompt)}
                    className="rounded-full border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-700)] transition hover:border-[var(--surface-accent)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-[1.6rem] border border-[var(--border-soft)] bg-[#fcfbf7] p-4">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-[1.2rem] border border-[var(--border-soft)] bg-white px-4 py-3 text-base outline-none"
            placeholder="Ask your admission question here..."
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS[language].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMessage(prompt)}
                  className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-700)] transition hover:border-[var(--surface-accent)]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => submitMessage(message)}
              disabled={loading || message.trim().length === 0}
              className="rounded-full bg-[var(--surface-strong)] px-6 py-3 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
