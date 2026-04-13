"use client";

import { useState } from "react";

import { COURSE_DEFINITIONS } from "@/lib/acpc/course-definitions";
import { CourseCode, RecommendationResult } from "@/lib/acpc/types";

export function CounselingClient() {
  const [courseCode, setCourseCode] = useState<CourseCode>("degree-engineering");
  const [meritRank, setMeritRank] = useState("1200");
  const [category, setCategory] = useState("GEN");
  const [preferredBranches, setPreferredBranches] = useState("Computer Engineering, Information Technology");
  const [preferredLocations, setPreferredLocations] = useState("Ahmedabad, Gandhinagar");
  const [instituteTypes, setInstituteTypes] = useState("Government, Grant-in-Aid");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitProfile() {
    setLoading(true);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseCode,
          meritRank: meritRank ? Number(meritRank) : undefined,
          category,
          preferredBranches: preferredBranches
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          preferredLocations: preferredLocations
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          instituteTypes: instituteTypes
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      setResult((await response.json()) as RecommendationResult);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr]">
      <section className="panel rounded-[2rem] p-6">
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="eyebrow">Profile-Led Counseling</span>
            <h2 className="font-serif text-3xl font-bold text-[var(--ink-900)]">
              Build a short list using synchronized closure records and your preferences.
            </h2>
            <p className="text-base text-[var(--ink-700)]">
              The engine ranks options as safe, competitive, and ambitious. If structured
              source coverage is thin for a course family, the platform says so explicitly.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-[var(--ink-700)]">
              Course family
              <select
                value={courseCode}
                onChange={(event) => setCourseCode(event.target.value as CourseCode)}
                className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 outline-none"
              >
                {COURSE_DEFINITIONS.map((course) => (
                  <option key={course.code} value={course.code}>
                    {course.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[var(--ink-700)]">
              Merit rank
              <input
                value={meritRank}
                onChange={(event) => setMeritRank(event.target.value)}
                className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[var(--ink-700)]">
              Category
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[var(--ink-700)]">
              Preferred branches
              <input
                value={preferredBranches}
                onChange={(event) => setPreferredBranches(event.target.value)}
                className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[var(--ink-700)]">
              Preferred locations
              <input
                value={preferredLocations}
                onChange={(event) => setPreferredLocations(event.target.value)}
                className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[var(--ink-700)]">
              Preferred institute types
              <input
                value={instituteTypes}
                onChange={(event) => setInstituteTypes(event.target.value)}
                className="rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3 outline-none"
              />
            </label>

            <button
              type="button"
              onClick={submitProfile}
              disabled={loading}
              className="rounded-full bg-[var(--surface-strong)] px-5 py-3 text-base font-semibold text-white transition disabled:opacity-60"
            >
              {loading ? "Analyzing official records..." : "Generate counseling options"}
            </button>
          </div>
        </div>
      </section>

      <section className="panel rounded-[2rem] p-6">
        {result ? (
          <div className="space-y-6">
            <div>
              <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-sm font-semibold text-[var(--ink-900)]">
                {result.dataAvailability === "grounded" ? "Grounded recommendation set" : "Limited dataset mode"}
              </span>
              <p className="mt-4 text-base leading-8 text-[var(--ink-700)]">{result.summary}</p>
            </div>

            {([
              ["Safe", result.safeOptions],
              ["Competitive", result.competitiveOptions],
              ["Ambitious", result.ambitiousOptions],
            ] as const).map(([label, options]) => (
              <div key={label} className="space-y-3">
                <h3 className="font-serif text-2xl font-bold text-[var(--ink-900)]">
                  {label} options
                </h3>
                {options.length > 0 ? (
                  <div className="grid gap-3">
                    {options.map((option) => (
                      <div key={option.id} className="rounded-[1.5rem] bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[var(--surface-accent)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white">
                            {option.instituteType}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
                            {option.category}
                          </span>
                        </div>
                        <p className="mt-3 text-lg font-semibold text-[var(--ink-900)]">
                          {option.combinedLabel}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--ink-700)]">
                          {option.rationale}
                        </p>
                        <a
                          href={option.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-sm font-semibold text-[var(--surface-accent)]"
                        >
                          {option.sourceTitle}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] bg-white p-4 text-sm text-[var(--ink-700)]">
                    No options were classified in this band for the current profile.
                  </div>
                )}
              </div>
            ))}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <h4 className="mb-3 font-semibold text-[var(--ink-900)]">Warnings</h4>
                <ul className="grid gap-2 text-sm text-[var(--ink-700)]">
                  {result.warnings.map((warning) => (
                    <li key={warning} className="rounded-2xl bg-white px-4 py-3">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-3 font-semibold text-[var(--ink-900)]">Next steps</h4>
                <ul className="grid gap-2 text-sm text-[var(--ink-700)]">
                  {result.nextSteps.map((step) => (
                    <li key={step} className="rounded-2xl bg-white px-4 py-3">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[24rem] items-center justify-center rounded-[1.75rem] border border-dashed border-[var(--border-soft)] bg-white/60 p-6 text-center text-[var(--ink-500)]">
            Submit a student profile to see source-backed option bands and advisory guidance.
          </div>
        )}
      </section>
    </div>
  );
}
