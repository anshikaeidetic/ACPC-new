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

const DESK_CAPABILITIES = [
  "Eligibility, documents, registration, and fee guidance",
  "Round-wise reporting, seat status, and official notice explanations",
  "Source-linked answers with next actions and warnings",
];

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

  const selectedCourse = COURSE_DEFINITIONS.find((course) => course.code === courseCode);

  return (
    <section className="panel-strong overflow-hidden rounded-[2.4rem]">
      <div className="section-banner signal-grid px-6 py-6 text-white md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <span className="eyebrow border-white/20 bg-white/10 text-white">
              ACPC Student Support Desk
            </span>
            <div className="space-y-3">
              <h2 className="font-serif text-3xl font-bold md:text-5xl">
                Admission questions in. Officially grounded response note out.
              </h2>
              <p className="max-w-3xl text-base leading-8 text-slate-100/88 md:text-lg">
                Ask one question at a time and receive a structured ACPC response with
                verified facts, next actions, warnings, and source references.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:max-w-[34rem]">
            {DESK_CAPABILITIES.map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-white/14 bg-white/10 px-4 py-3 text-sm leading-7 text-slate-100/88"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-5 md:px-7 md:py-7">
        <div className="grid gap-4 lg:grid-cols-[0.68fr_0.32fr]">
          <div className="status-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--surface-accent)]">
                  Active Course Context
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--ink-900)]">
                  {selectedCourse?.label}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-700)]">
                  {selectedCourse?.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
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
                        : "bg-[var(--surface-base)] text-[var(--ink-700)]"
                    }`}
                  >
                    {value === "en" ? "English" : "Gujarati"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="status-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--surface-accent)]">
              Support Scope
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedCourse?.supportTags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-700)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="status-card min-h-[30rem] p-5 md:p-6">
          {response ? (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--surface-accent)]">
                    Response Dossier
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--ink-900)]">
                    Structured ACPC support note
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--surface-muted)] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-900)]">
                    {response.mode === "grounded" ? "grounded mode" : "fallback mode"}
                  </span>
                  {response.selectedCourse ? (
                    <span className="rounded-full bg-[var(--surface-base)] px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-700)]">
                      {COURSE_DEFINITIONS.find((course) => course.code === response.selectedCourse)?.shortLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="accent-bar rounded-[1.6rem] bg-[rgba(255,255,255,0.88)] pl-5 pr-5 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--surface-accent)]">
                  Verified Answer
                </p>
                <p className="mt-3 text-base leading-8 text-[var(--ink-700)] md:text-lg">
                  {response.directAnswer}
                </p>
              </div>

              {response.recommendedOptions.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {response.recommendedOptions.map((option) => (
                    <div key={option.id} className="rounded-[1.5rem] bg-[var(--surface-base)] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
                          {option.instituteType}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
                          {option.category}
                        </span>
                      </div>
                      <p className="mt-3 text-lg font-semibold text-[var(--ink-900)]">
                        {option.combinedLabel}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--ink-700)]">
                        {option.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[1.5rem] bg-[rgba(217,119,6,0.08)] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--surface-saffron)]">
                    Required Next Actions
                  </p>
                  <ul className="mt-4 grid gap-3 text-sm leading-7 text-[var(--ink-700)]">
                    {response.nextSteps.map((step) => (
                      <li key={step} className="rounded-[1.2rem] bg-white px-4 py-3">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[1.5rem] bg-[rgba(31,107,82,0.08)] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--surface-green)]">
                    Conditions And Alerts
                  </p>
                  <ul className="mt-4 grid gap-3 text-sm leading-7 text-[var(--ink-700)]">
                    {response.warnings.length > 0 ? (
                      response.warnings.map((warning) => (
                        <li key={warning} className="rounded-[1.2rem] bg-white px-4 py-3">
                          {warning}
                        </li>
                      ))
                    ) : (
                      <li className="rounded-[1.2rem] bg-white px-4 py-3">
                        No additional alerts were required for this response.
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-[var(--surface-strong)] p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-200/80">
                  Source Register
                </p>
                <div className="mt-4 grid gap-3">
                  {response.sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[1.2rem] border border-white/12 bg-white/8 px-4 py-3 transition hover:bg-white/14"
                    >
                      <span className="block text-sm font-semibold">{source.title}</span>
                      <span className="mt-1 block text-[11px] uppercase tracking-[0.16em] text-slate-200/80">
                        {source.kind}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid h-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[1.6rem] bg-[linear-gradient(160deg,rgba(16,42,67,0.08),rgba(217,119,6,0.06))] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--surface-accent)]">
                  Desk Readiness
                </p>
                <h3 className="mt-3 font-serif text-3xl font-bold text-[var(--ink-900)]">
                  Start with one admission question.
                </h3>
                <p className="mt-3 text-base leading-8 text-[var(--ink-700)]">
                  The desk responds best to direct student queries such as dates, document
                  requirements, registration flow, merit handling, reporting instructions, and
                  course-specific clarification.
                </p>
              </div>

              <div className="grid gap-3">
                {QUICK_PROMPTS[language].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setMessage(prompt)}
                    className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white px-4 py-4 text-left text-sm leading-7 text-[var(--ink-700)] transition hover:border-[var(--surface-accent)] hover:bg-[var(--surface-base)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="status-card p-5">
          <div className="grid gap-4 lg:grid-cols-[0.3fr_0.7fr]">
            <label className="grid gap-2 text-sm font-semibold text-[var(--ink-700)]">
              Course family
              <select
                value={courseCode}
                onChange={(event) => setCourseCode(event.target.value as CourseCode)}
                className="rounded-[1.2rem] border border-[var(--border-soft)] bg-white px-4 py-3 outline-none"
              >
                {COURSE_DEFINITIONS.map((course) => (
                  <option key={course.code} value={course.code}>
                    {course.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[var(--ink-700)]">
              Question for ACPC support
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white px-4 py-3 outline-none"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_PROMPTS[language].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setMessage(prompt)}
                className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-base)] px-3 py-2 text-sm font-semibold text-[var(--ink-700)] transition hover:border-[var(--surface-accent)] hover:bg-white"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm leading-7 text-[var(--ink-500)]">
              Answers are grounded in synchronized official ACPC documents and will state
              limitations explicitly when source coverage is incomplete.
            </p>
            <button
              type="button"
              onClick={() => submitMessage(message)}
              disabled={loading || message.trim().length === 0}
              className="rounded-full bg-[var(--surface-accent)] px-6 py-3 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Preparing response note..." : "Issue support response"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
