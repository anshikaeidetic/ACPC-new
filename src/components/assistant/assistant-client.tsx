"use client";

import { useState } from "react";

import { COURSE_DEFINITIONS } from "@/lib/acpc/course-definitions";
import { ChatResponse, CourseCode, SupportedLanguage } from "@/lib/acpc/types";

const QUICK_PROMPTS: Record<SupportedLanguage, string[]> = {
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
};

const UI_COPY: Record<
  SupportedLanguage,
  {
    emptyTitle: string;
    emptyBody: string;
    placeholder: string;
    loading: string;
    send: string;
    sending: string;
    suggestions: string;
    sources: string;
    error: string;
  }
> = {
  en: {
    emptyTitle: "Ask ACPC anything",
    emptyBody:
      "Dates, documents, eligibility, choice filling, reporting, cutoff trends, or college options.",
    placeholder: "Ask your admission question...",
    loading: "Thinking through the official ACPC sources...",
    send: "Send",
    sending: "Sending...",
    suggestions: "Try asking",
    sources: "Sources",
    error: "The response could not be prepared right now.",
  },
  gu: {
    emptyTitle: "ACPC ને પ્રશ્ન પૂછો",
    emptyBody:
      "તારીખો, દસ્તાવેજો, યોગ્યતા, ચોઇસ ફિલિંગ, રિપોર્ટિંગ, કટઓફ ટ્રેન્ડ્સ અથવા કોલેજ વિકલ્પો વિશે પૂછો.",
    placeholder: "તમારો પ્રવેશ સંબંધિત પ્રશ્ન લખો...",
    loading: "સત્તાવાર ACPC સ્રોતો પરથી જવાબ તૈયાર થઈ રહ્યો છે...",
    send: "મોકલો",
    sending: "મોકલાઈ રહ્યું છે...",
    suggestions: "આ પણ પૂછો",
    sources: "Sources",
    error: "હાલ જવાબ તૈયાર કરી શકાતો નથી.",
  },
};

function isChatResponse(value: unknown): value is ChatResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as Record<string, unknown>;
  return (
    typeof input.answer === "string" &&
    Array.isArray(input.highlights) &&
    Array.isArray(input.sources) &&
    Array.isArray(input.suggestions)
  );
}

function AssistantMessage(props: { response: ChatResponse }) {
  return (
    <div className="max-w-[84%] rounded-[1.6rem] border border-[rgba(16,42,67,0.08)] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(16,42,67,0.06)]">
      <div className="whitespace-pre-wrap text-[15px] leading-8 text-[var(--ink-900)]">
        {props.response.answer}
      </div>

      {props.response.highlights.length > 0 ? (
        <ul className="mt-4 grid gap-2 text-sm leading-7 text-[var(--ink-700)]">
          {props.response.highlights.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-[0.7rem] h-1.5 w-1.5 rounded-full bg-[var(--surface-accent)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
  const prompts = response?.suggestions?.length ? response.suggestions : QUICK_PROMPTS[language];

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
            ? String((payload as { error?: string }).error || copy.error)
            : copy.error;
        throw new Error(errorMessage);
      }

      if (!isChatResponse(payload)) {
        throw new Error(copy.error);
      }

      setResponse(payload);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : copy.error,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-[940px]">
      <div className="overflow-hidden rounded-[2rem] border border-[rgba(16,42,67,0.08)] bg-white/90 shadow-[0_28px_80px_rgba(16,42,67,0.12)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-[rgba(16,42,67,0.08)] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--surface-green)]" />
            <p className="text-sm font-semibold text-[var(--ink-900)]">ACPC</p>
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
                  {value === "en" ? "English" : "ગુજરાતી"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-[33rem] bg-[#f7f4ee] px-4 py-5 md:px-6">
          {loading ? (
            <div className="flex h-full min-h-[24rem] items-center justify-center">
              <div className="rounded-[1.5rem] border border-[rgba(16,42,67,0.08)] bg-white px-5 py-4 text-sm text-[var(--ink-500)]">
                {copy.loading}
              </div>
            </div>
          ) : response ? (
            <div className="space-y-5">
              <div className="flex justify-end">
                <div className="max-w-[72%] rounded-[1.4rem] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-7 text-white">
                  {submittedQuestion}
                </div>
              </div>

              <div className="flex justify-start">
                <AssistantMessage response={response} />
              </div>

              {response.sources.length > 0 ? (
                <div className="pl-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
                    {copy.sources}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {response.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[rgba(16,42,67,0.08)] bg-white px-3 py-2 text-xs font-medium text-[var(--ink-700)] transition hover:border-[rgba(156,106,47,0.28)]"
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-[24rem] flex-col items-center justify-center text-center">
              <div className="max-w-2xl">
                <p className="text-[2rem] font-semibold tracking-[-0.03em] text-[var(--ink-900)]">
                  {copy.emptyTitle}
                </p>
                <p className="mt-3 text-base leading-8 text-[var(--ink-500)]">{copy.emptyBody}</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="mt-4 rounded-[1.3rem] border border-[rgba(143,45,45,0.18)] bg-[#fcf4f4] px-4 py-3 text-sm text-[#7d3434]">
              {error}
            </div>
          ) : null}

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
              {copy.suggestions}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setMessage(prompt)}
                  className="rounded-full border border-[rgba(16,42,67,0.08)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink-700)] transition hover:border-[rgba(156,106,47,0.28)]"
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
              placeholder={copy.placeholder}
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
