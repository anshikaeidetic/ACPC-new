"use client";

import { useState } from "react";

import { COURSE_DEFINITIONS } from "@/lib/acpc/course-definitions";
import {
  ChatOptionItem,
  ChatResponse,
  ChatSection,
  CourseCode,
  SupportedLanguage,
} from "@/lib/acpc/types";

const QUICK_PROMPTS = {
  en: [
    "What are the latest key dates for degree engineering admission?",
    "Which documents should I verify before registration?",
    "Suggest options for my rank after I share my profile.",
  ],
  gu: [
    "ડિગ્રી એન્જિનિયરિંગ માટે હાલની સત્તાવાર તારીખો શું છે?",
    "રજીસ્ટ્રેશન પહેલાં કયા દસ્તાવેજો ચકાસવા જોઈએ?",
    "મારી પ્રોફાઇલ મુજબ યોગ્ય કોલેજ વિકલ્પો સૂચવો.",
  ],
} satisfies Record<SupportedLanguage, string[]>;

const UI_COPY = {
  en: {
    workspaceLabel: "ACPC Support Desk",
    workspaceNote: "Structured official note workspace",
    questionLabel: "Current Query",
    placeholderTitle: "ACPC structured support",
    placeholderBody:
      "Ask one admission question at a time. The response is assembled as a course-specific note grounded in synchronized official ACPC sources.",
    placeholderComposer: "Ask about dates, documents, eligibility, process, cutoff, or options...",
    loading: "Preparing grounded note...",
    send: "Send",
    sending: "Preparing...",
    sourceLabel: "Sources",
    suggestionsLabel: "Suggested follow-ups",
    fallbackLabel: "Source-backed mode",
    groundedLabel: "Structured response",
    errorFallback: "Unable to prepare the ACPC note right now.",
    english: "English",
    gujarati: "Gujarati",
  },
  gu: {
    workspaceLabel: "ACPC સહાય ડેસ્ક",
    workspaceNote: "ગોઠવાયેલ સત્તાવાર નોંધ વર્કસ્પેસ",
    questionLabel: "હાલનો પ્રશ્ન",
    placeholderTitle: "ACPC ગોઠવાયેલ સહાય",
    placeholderBody:
      "એક વખતે એક જ પ્રવેશ પ્રશ્ન પૂછો. જવાબ સમન્વયિત સત્તાવાર ACPC સ્રોતો પરથી કોર્સ-વિશિષ્ટ નોંધ તરીકે આપવામાં આવશે.",
    placeholderComposer: "તારીખો, દસ્તાવેજો, યોગ્યતા, પ્રક્રિયા, કટઓફ અથવા વિકલ્પો વિશે પૂછો...",
    loading: "સોર્સ આધારિત નોંધ તૈયાર થઈ રહી છે...",
    send: "મોકલો",
    sending: "તૈયાર થઈ રહ્યું છે...",
    sourceLabel: "સ્રોતો",
    suggestionsLabel: "આગળ પૂછવા યોગ્ય મુદ્દા",
    fallbackLabel: "સોર્સ આધારિત મોડ",
    groundedLabel: "ગોઠવાયેલ જવાબ",
    errorFallback: "હાલ ACPC નોંધ તૈયાર કરી શકાતી નથી.",
    english: "English",
    gujarati: "ગુજરાતી",
  },
} satisfies Record<
  SupportedLanguage,
  {
    workspaceLabel: string;
    workspaceNote: string;
    questionLabel: string;
    placeholderTitle: string;
    placeholderBody: string;
    placeholderComposer: string;
    loading: string;
    send: string;
    sending: string;
    sourceLabel: string;
    suggestionsLabel: string;
    fallbackLabel: string;
    groundedLabel: string;
    errorFallback: string;
    english: string;
    gujarati: string;
  }
>;

function bucketClasses(bucket?: ChatOptionItem["bucket"]) {
  if (bucket === "safe") {
    return "border-[#cfe4d7] bg-[#edf7f0] text-[#24553d]";
  }

  if (bucket === "competitive") {
    return "border-[#f0dcc0] bg-[#fbf3e8] text-[#8a5520]";
  }

  if (bucket === "ambitious") {
    return "border-[#ead0d0] bg-[#fbf1f1] text-[#7d3434]";
  }

  return "border-[var(--border-soft)] bg-white text-[var(--ink-700)]";
}

function renderListItems(items: string[]) {
  return (
    <ul className="grid gap-2 text-sm leading-7 text-[var(--ink-700)]">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-2xl border border-[rgba(16,42,67,0.08)] bg-white px-4 py-3"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function renderSection(section: ChatSection) {
  if (section.type === "note") {
    return (
      <div className="rounded-[1.4rem] border border-[rgba(16,42,67,0.08)] bg-white px-4 py-4">
        <p className="text-sm font-semibold text-[var(--ink-900)]">{section.title}</p>
        <p className="mt-2 text-sm leading-7 text-[var(--ink-700)]">{section.content}</p>
      </div>
    );
  }

  if (section.type === "options") {
    return (
      <div className="grid gap-3">
        {section.items.map((item) => (
          <div
            key={`${item.label}-${item.bucket ?? "general"}`}
            className="rounded-[1.4rem] border border-[rgba(16,42,67,0.08)] bg-white px-4 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-2xl text-sm font-semibold leading-6 text-[var(--ink-900)]">
                {item.label}
              </p>
              {item.bucket ? (
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${bucketClasses(item.bucket)}`}
                >
                  {item.bucket}
                </span>
              ) : null}
            </div>
            {item.detail ? (
              <p className="mt-2 text-sm leading-7 text-[var(--ink-700)]">{item.detail}</p>
            ) : null}
            {item.meta?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.meta.map((entry) => (
                  <span
                    key={entry}
                    className="rounded-full border border-[rgba(16,42,67,0.08)] bg-[#f8f5ef] px-3 py-1 text-xs font-medium text-[var(--ink-500)]"
                  >
                    {entry}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return renderListItems(section.items);
}

function ResponseView(props: {
  response: ChatResponse;
  submittedQuestion: string;
  language: SupportedLanguage;
}) {
  const copy = UI_COPY[props.language];

  return (
    <div className="space-y-5">
      <div className="rounded-[1.6rem] border border-[rgba(16,42,67,0.08)] bg-white px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--surface-accent)]">
              {copy.questionLabel}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--ink-700)]">{props.submittedQuestion}</p>
          </div>
          <span className="rounded-full border border-[rgba(16,42,67,0.08)] bg-[#f8f5ef] px-3 py-1 text-xs font-semibold text-[var(--ink-500)]">
            {props.response.deliveryMode === "grounded" ? copy.groundedLabel : copy.fallbackLabel}
          </span>
        </div>

        <div className="mt-5">
          <p className="text-[1.35rem] font-semibold tracking-[-0.02em] text-[var(--ink-900)]">
            {props.response.title}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--ink-700)]">
            {props.response.summary}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {props.response.sections.map((section) => (
          <section
            key={`${section.type}-${section.title}`}
            className="rounded-[1.6rem] border border-[rgba(16,42,67,0.08)] bg-[#fcfaf6] px-4 py-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--surface-accent)]">
              {section.title}
            </p>
            <div className="mt-3">{renderSection(section)}</div>
          </section>
        ))}
      </div>

      {props.response.sources.length > 0 ? (
        <section className="rounded-[1.6rem] border border-[rgba(16,42,67,0.08)] bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--surface-accent)]">
            {copy.sourceLabel}
          </p>
          <div className="mt-3 grid gap-3">
            {props.response.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-[rgba(16,42,67,0.08)] bg-[#faf7f1] px-4 py-3 text-sm leading-6 text-[var(--ink-700)] transition hover:border-[rgba(198,123,40,0.3)]"
              >
                <span className="block font-semibold text-[var(--ink-900)]">{source.title}</span>
                <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-[var(--ink-500)]">
                  {source.kind}
                  {source.issuedOn ? ` • ${source.issuedOn}` : ""}
                </span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function isChatResponse(value: unknown): value is ChatResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as Record<string, unknown>;
  return (
    typeof input.title === "string" &&
    typeof input.summary === "string" &&
    Array.isArray(input.sections) &&
    Array.isArray(input.sources) &&
    Array.isArray(input.suggestions)
  );
}

export function AssistantClient() {
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [courseCode, setCourseCode] = useState<CourseCode>("degree-engineering");
  const [message, setMessage] = useState(QUICK_PROMPTS.en[0]);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const copy = UI_COPY[language];
  const activeSuggestions = response?.suggestions?.length ? response.suggestions : QUICK_PROMPTS[language];

  async function submitMessage(currentMessage: string) {
    const trimmedMessage = currentMessage.trim();

    if (!trimmedMessage) {
      return;
    }

    setLoading(true);
    setError("");
    setSubmittedQuestion(trimmedMessage);

    try {
      const apiResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
          selectedCourse: courseCode,
          language,
        }),
      });

      const payload = (await apiResponse.json()) as unknown;

      if (!apiResponse.ok) {
        const errorMessage =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: string }).error || copy.errorFallback)
            : copy.errorFallback;
        throw new Error(errorMessage);
      }

      if (!isChatResponse(payload)) {
        throw new Error(copy.errorFallback);
      }

      setResponse(payload);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : copy.errorFallback,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-[980px]">
      <div className="overflow-hidden rounded-[2rem] border border-[rgba(16,42,67,0.08)] bg-white/88 shadow-[0_28px_80px_rgba(16,42,67,0.12)] backdrop-blur">
        <div className="flex flex-col gap-4 border-b border-[rgba(16,42,67,0.08)] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--surface-green)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--ink-900)]">{copy.workspaceLabel}</p>
              <p className="text-xs tracking-[0.08em] text-[var(--ink-500)]">{copy.workspaceNote}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={courseCode}
              onChange={(event) => setCourseCode(event.target.value as CourseCode)}
              className="rounded-full border border-[rgba(16,42,67,0.1)] bg-[#f8f5ef] px-4 py-2 text-sm font-medium text-[var(--ink-700)] outline-none"
            >
              {COURSE_DEFINITIONS.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.label}
                </option>
              ))}
            </select>

            <div className="flex rounded-full border border-[rgba(16,42,67,0.1)] bg-[#f8f5ef] p-1">
              {(["en", "gu"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setLanguage(value);
                    setMessage(QUICK_PROMPTS[value][0]);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    language === value
                      ? "bg-white text-[var(--ink-900)] shadow-[0_6px_18px_rgba(16,42,67,0.08)]"
                      : "text-[var(--ink-500)]"
                  }`}
                >
                  {value === "en" ? copy.english : copy.gujarati}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-5 md:px-6">
          <div className="min-h-[30rem] rounded-[1.8rem] border border-[rgba(16,42,67,0.06)] bg-[#f7f4ee] px-4 py-4 md:px-5 md:py-5">
            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-[var(--ink-500)]">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--surface-accent)]" />
                  <span>{copy.loading}</span>
                </div>
                <div className="space-y-3 rounded-[1.6rem] border border-[rgba(16,42,67,0.08)] bg-white px-5 py-5">
                  <div className="h-4 w-40 rounded-full bg-[#ece6d8]" />
                  <div className="h-4 w-full rounded-full bg-[#f1ebde]" />
                  <div className="h-4 w-[88%] rounded-full bg-[#f1ebde]" />
                  <div className="h-4 w-[72%] rounded-full bg-[#f1ebde]" />
                </div>
              </div>
            ) : response ? (
              <ResponseView
                response={response}
                submittedQuestion={submittedQuestion}
                language={language}
              />
            ) : (
              <div className="flex h-full min-h-[26rem] flex-col items-center justify-center text-center">
                <div className="max-w-2xl rounded-[1.8rem] border border-[rgba(16,42,67,0.08)] bg-white px-6 py-8">
                  <p className="text-[1.5rem] font-semibold tracking-[-0.02em] text-[var(--ink-900)]">
                    {copy.placeholderTitle}
                  </p>
                  <p className="mt-3 text-sm leading-8 text-[var(--ink-700)]">
                    {copy.placeholderBody}
                  </p>
                </div>
              </div>
            )}
          </div>

          {error ? (
            <div className="mt-4 rounded-[1.3rem] border border-[rgba(143,45,45,0.18)] bg-[#fcf4f4] px-4 py-3 text-sm text-[#7d3434]">
              {error}
            </div>
          ) : null}

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
              {copy.suggestionsLabel}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMessage(prompt)}
                  className="rounded-full border border-[rgba(16,42,67,0.08)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink-700)] transition hover:border-[rgba(198,123,40,0.3)]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <form
            className="mt-4 rounded-[1.8rem] border border-[rgba(16,42,67,0.08)] bg-white px-4 py-4 shadow-[0_18px_45px_rgba(16,42,67,0.06)]"
            onSubmit={(event) => {
              event.preventDefault();
              void submitMessage(message);
            }}
          >
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className="w-full resize-none bg-transparent text-base leading-7 text-[var(--ink-900)] outline-none placeholder:text-[var(--ink-500)]"
              placeholder={copy.placeholderComposer}
            />

            <div className="mt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={loading || message.trim().length === 0}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--surface-strong)] px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? copy.sending : copy.send}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
