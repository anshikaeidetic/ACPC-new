# ACPC Admission Support

ACPC Admission Support is a public-facing admission guidance platform for Gujarat professional courses. It combines official ACPC notices, key dates, closure reports, and counseling logic into a fast support experience built for students who need verified answers without waiting on peak-season helplines.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Groq API for grounded answer synthesis
- File-based ACPC data sync with generated JSON output

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:

   ```bash
   copy .env.example .env.local
   ```

3. Add your `GROQ_API_KEY` to `.env.local`.

4. Synchronize official ACPC data:

   ```bash
   npm run ingest
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

## Commands

- `npm run ingest` refreshes the official-source dataset.
- `npm run lint` runs the code quality checks.
- `npm run test` runs deterministic parser, retrieval, and recommendation tests.
- `npm run build` verifies the production build.

## Data Model

The generated dataset is written to `src/data/generated/acpc-dataset.json`. It stores:

- course metadata
- official source documents
- notices and key dates
- cutoff / closure records
- seat and vacancy records
- helpdesk contact details

If a course page does not currently expose a suitable official closure dataset, the application keeps support flows available and explicitly marks recommendation depth as limited instead of guessing.
