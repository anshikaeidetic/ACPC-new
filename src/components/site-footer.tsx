import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-[var(--border-soft)] bg-[var(--surface-strong)] text-[var(--ink-inverse)]">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-3">
          <p className="font-serif text-2xl font-bold">ACPC Admission Support</p>
          <p className="max-w-2xl text-sm text-slate-200/80">
            Built for fast, reliable, and student-first admission guidance. All factual
            responses are grounded in synchronized ACPC official sources and marked as
            limited when source coverage is incomplete.
          </p>
        </div>

        <div className="grid gap-3 text-sm text-slate-200/80">
          <Link href="/" className="transition hover:text-white">
            Support Desk
          </Link>
          <a
            href="https://gujacpc.admissions.nic.in/contact-us/"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-white"
          >
            Official ACPC Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
