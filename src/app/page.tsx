import { AssistantClient } from "@/components/assistant/assistant-client";

export default function HomePage() {
  return (
    <div className="page-shell space-y-8 py-10">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <span className="eyebrow">ACPC Admission Support</span>
          <h1 className="font-serif text-4xl font-bold text-[var(--ink-900)] md:text-6xl">
            One branded support desk for admission guidance across ACPC course families.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-[var(--ink-700)]">
            The public interface opens directly into the support desk. Students can ask
            admission questions, review grounded source-linked responses, and move through
            the process without navigating a generic dashboard.
          </p>
        </div>

        <div className="panel rounded-[2rem] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--surface-accent)]">
            Student Support Focus
          </p>
          <div className="mt-4 grid gap-3">
            {[
              "Fast answers during peak admission windows",
              "Official-source grounding with explicit warnings",
              "Bilingual support for common student queries",
            ].map((item) => (
              <div key={item} className="rounded-[1.4rem] bg-white px-4 py-4 text-sm leading-7 text-[var(--ink-700)]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <AssistantClient />
    </div>
  );
}
