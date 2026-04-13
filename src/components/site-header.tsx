import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[rgba(248,243,232,0.92)] backdrop-blur-xl">
      <div className="h-1 w-full bg-[linear-gradient(90deg,#d97706_0%,#d97706_33%,#f8fafc_33%,#f8fafc_66%,#1f6b52_66%,#1f6b52_100%)]" />
      <div className="border-b border-[rgba(16,42,67,0.08)] bg-[rgba(255,255,255,0.55)]">
        <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">
          <span>Government of Gujarat</span>
          <span>Directorate of Technical Education</span>
          <span>Admission Committee for Professional Courses</span>
        </div>
      </div>

      <div className="page-shell flex items-center justify-between gap-4 py-4">
        <Link href="/" className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-[1.6rem] border border-white/30 bg-[linear-gradient(145deg,#102a43_0%,#1b4965_100%)] text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink-inverse)] shadow-[0_16px_40px_rgba(16,42,67,0.22)]">
            ACPC
          </div>
          <div>
            <p className="font-serif text-xl font-bold text-[var(--ink-900)]">
              ACPC Admission Support
            </p>
            <p className="text-sm text-[var(--ink-500)]">
              Official-source portal for guidance, counseling, and round readiness
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <span className="rounded-full border border-[var(--border-soft)] bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--ink-700)]">
            Support Desk
          </span>
          <a
            href="https://gujacpc.admissions.nic.in/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--border-soft)] bg-white/75 px-4 py-2 text-sm font-semibold text-[var(--ink-700)] transition hover:border-[var(--surface-accent)] hover:text-[var(--surface-accent)]"
          >
            Official ACPC Portal
          </a>
        </div>
      </div>
    </header>
  );
}
