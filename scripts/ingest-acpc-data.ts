import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";

import { COURSE_DEFINITIONS } from "../src/lib/acpc/course-definitions";
import {
  extractIssuedOn,
  inferDocumentKind,
  normalizeWhitespace,
  parseCutoffRow,
  parseSeatRows,
  splitPdfRows,
} from "../src/lib/acpc/document-parsers";
import type {
  AcpcDataset,
  ContactDetails,
  CourseCode,
  CutoffRecord,
  NoticeRecord,
  SeatRecord,
  SourceDocument,
} from "../src/lib/acpc/types";

const SESSION = "2026-27";
const CONTACT_URL = "https://gujacpc.admissions.nic.in/contact-us/";

const COURSE_SOURCE_PAGES: Record<CourseCode, string> = {
  "degree-engineering": "https://gujacpc.admissions.nic.in/be-b-tech/",
  pharmacy: "https://gujacpc.admissions.nic.in/pharmacy/",
  ddcet: "https://gujacpc.admissions.nic.in/ddcet/",
  "diploma-to-degree": "https://gujacpc.admissions.nic.in/diploma/",
  "me-mtech": "https://gujacpc.admissions.nic.in/me-mtech/",
  mpharma: "https://gujacpc.admissions.nic.in/mpharma/",
  "mba-mca": "https://gujacpc.admissions.nic.in/mba-mca/",
  "mba-coe": "https://gujacpc.admissions.nic.in/mba-coe/",
  "b-arch": "https://gujacpc.admissions.nic.in/b-arch/",
  "m-arch": "https://gujacpc.admissions.nic.in/m-arch/",
  "b-plan": "https://gujacpc.admissions.nic.in/b-plan/",
  "m-plan": "https://gujacpc.admissions.nic.in/m-plan/",
  "bid-bct": "https://gujacpc.admissions.nic.in/b-i-d-b-c-t/",
};

function makeAbsoluteUrl(href: string) {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  return new URL(href, "https://gujacpc.admissions.nic.in").toString();
}

async function fetchHtml(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchPdfText(url: string) {
  const parser = new PDFParse({ url });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

async function fetchContact() {
  const html = await fetchHtml(CONTACT_URL);
  const $ = cheerio.load(html);
  const lines = $("main, body")
    .text()
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const contact: ContactDetails = {
    office: "Admission Committee for Professional Courses",
    address: [
      "Admission Building, Nr. Library, L. D. College of Engg. Campus",
      "Ahmedabad - 380015, India",
    ],
    phone: "+91-79-26566000",
    fax: "+91-79-26304118",
    email: "acpc-dte@gujarat.gov.in",
    url: CONTACT_URL,
  };

  for (const line of lines) {
    if (line.startsWith("Phone")) {
      contact.phone = line.split(":").slice(1).join(":").trim();
    }

    if (line.startsWith("Fax")) {
      contact.fax = line.split(":").slice(1).join(":").trim();
    }

    if (line.startsWith("E-mail")) {
      contact.email = line
        .split(":")
        .slice(1)
        .join(":")
        .trim()
        .replace(/\[at\]/gi, "@")
        .replace(/\[dot\]/gi, ".");
    }
  }

  return contact;
}

async function syncCourseDocuments(courseCode: CourseCode, url: string) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const sourceDocuments: SourceDocument[] = [];
  const notices: NoticeRecord[] = [];
  const cutoffRecords: CutoffRecord[] = [];
  const seatRecords: SeatRecord[] = [];

  const course = COURSE_DEFINITIONS.find((item) => item.code === courseCode)!;
  const title = $("h1").first().text().trim();
  const anchors = $("a")
    .toArray()
    .map((element) => {
      const anchor = $(element);
      const href = anchor.attr("href");
      const text = normalizeWhitespace(anchor.text());
      return {
        href: href ? makeAbsoluteUrl(href) : "",
        text,
      };
    })
    .filter((anchor) => anchor.href && anchor.text.length > 6)
    .filter((anchor) => !anchor.text.startsWith("Share on"))
    .filter((anchor) => !anchor.href.includes("facebook.com"))
    .filter((anchor) => !anchor.href.includes("linkedin.com"))
    .filter((anchor) => !anchor.href.endsWith("/"));

  let documentIndex = 0;

  for (const anchor of anchors) {
    const kind = inferDocumentKind(anchor.text);

    if (
      !anchor.href.endsWith(".pdf") &&
      !anchor.href.includes("guidelines") &&
      !anchor.href.includes("help")
    ) {
      continue;
    }

    documentIndex += 1;
    const id = `${courseCode}-doc-${documentIndex}`;
    const issuedOn = extractIssuedOn(anchor.text);
    let summary = `${course.label}: ${anchor.text}`;
    let snippet = "";

    if (anchor.href.endsWith(".pdf")) {
      try {
        const text = await fetchPdfText(anchor.href);
        snippet = normalizeWhitespace(text).slice(0, 900);
        summary = snippet.slice(0, 220) || summary;

        if (kind === "cutoff") {
          const rows = splitPdfRows(text).slice(0, 180);

          rows.forEach((row, rowIndex) => {
            const parsed = parseCutoffRow(row, {
              courseCode,
              session: SESSION,
              roundLabel: issuedOn?.startsWith("2025") ? "Historical round" : "Current round",
              sourceDocumentId: id,
              sourceTitle: anchor.text,
              sourceUrl: anchor.href,
              recordId: `${id}-cutoff-${rowIndex + 1}`,
            });

            if (parsed) {
              cutoffRecords.push(parsed);
            }
          });
        }

        if (kind === "seat") {
          seatRecords.push(
            ...parseSeatRows(text, {
              courseCode,
              session: SESSION,
              sourceDocumentId: id,
              sourceTitle: anchor.text,
              sourceUrl: anchor.href,
            }),
          );
        }
      } catch {
        summary = `${anchor.text}. PDF text could not be parsed during sync.`;
      }
    } else {
      try {
        const linkedHtml = await fetchHtml(anchor.href);
        const $$ = cheerio.load(linkedHtml);
        snippet = normalizeWhitespace($$("main, body").text()).slice(0, 900);
        summary = snippet.slice(0, 220) || summary;
      } catch {
        summary = `${anchor.text}. Linked guidance page could not be expanded during sync.`;
      }
    }

    sourceDocuments.push({
      id,
      courseCode,
      title: anchor.text,
      url: anchor.href,
      kind,
      session: SESSION,
      issuedOn,
      summary,
      snippet,
      keywords: [course.label, title, kind],
    });

    if (kind === "notice" || kind === "key-date" || kind === "guideline") {
      notices.push({
        id: `${id}-notice`,
        courseCode,
        title: anchor.text,
        url: anchor.href,
        issuedOn,
        summary,
        status: "active",
      });
    }
  }

  return {
    sourceDocuments,
    notices,
    cutoffRecords,
    seatRecords,
  };
}

async function run() {
  const contact = await fetchContact();
  const sourceDocuments: SourceDocument[] = [];
  const notices: NoticeRecord[] = [];
  const cutoffRecords: CutoffRecord[] = [];
  const seatRecords: SeatRecord[] = [];

  for (const course of COURSE_DEFINITIONS) {
    const pageUrl = COURSE_SOURCE_PAGES[course.code];

    try {
      const synced = await syncCourseDocuments(course.code, pageUrl);
      sourceDocuments.push(...synced.sourceDocuments);
      notices.push(...synced.notices);
      cutoffRecords.push(...synced.cutoffRecords);
      seatRecords.push(...synced.seatRecords);
      console.log(`Synchronized ${course.label}: ${synced.sourceDocuments.length} documents`);
    } catch (error) {
      console.warn(`Skipping ${course.label}: ${(error as Error).message}`);
    }
  }

  const dataset: AcpcDataset = {
    generatedAt: new Date().toISOString(),
    session: SESSION,
    contact,
    courses: COURSE_DEFINITIONS,
    sourceDocuments,
    notices: notices.sort((left, right) => (right.issuedOn ?? "").localeCompare(left.issuedOn ?? "")),
    cutoffRecords,
    seatRecords,
  };

  const outputPath = join(process.cwd(), "src", "data", "generated", "acpc-dataset.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(dataset, null, 2), "utf8");

  console.log(`Wrote dataset to ${outputPath}`);
  console.log(`Documents: ${dataset.sourceDocuments.length}`);
  console.log(`Cutoff records: ${dataset.cutoffRecords.length}`);
  console.log(`Seat records: ${dataset.seatRecords.length}`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
