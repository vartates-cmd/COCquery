import Papa from "papaparse";
import type { RecordField } from "@/lib/schema";

/**
 * Turns an uploaded .csv or .json file into plain rows keyed by our field names.
 *
 * Header matching is deliberately forgiving. "Registration Number",
 * "registration_number" and "registrationNumber" all mean the same thing to a
 * person, and rejecting a 500-row file over a underscore would be a poor way to
 * spend someone's afternoon.
 */

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;

export type RawImportRow = Partial<Record<RecordField, string>>;

export type ParseResult = {
  rows: RawImportRow[];
  /** Fatal problems — the file cannot be processed at all. */
  errors: string[];
  /** Header names in the file that we did not recognise. */
  unknownColumns: string[];
};

/** Collapse a header to a comparison key: lowercase, letters and digits only. */
function headerKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const FIELD_BY_HEADER_KEY: Record<string, RecordField> = {
  registrationnumber: "registrationNumber",
  regno: "registrationNumber",
  cooperativename: "cooperativeName",
  name: "cooperativeName",
  accountemail: "accountEmail",
  email: "accountEmail",
  cocstatus: "cocStatus",
  status: "cocStatus",
  reasonfordeferment: "reasonForDeferment",
  reason: "reasonForDeferment",
  reportsubmissionstatus: "reportSubmissionStatus",
  reportstatus: "reportSubmissionStatus",
};

/** Columns we ignore rather than report: the app owns these. */
const IGNORED_HEADER_KEYS = new Set(["id", "dateupdated", "updatedby"]);

function mapRow(
  input: Record<string, unknown>,
  unknown: Set<string>,
): RawImportRow {
  const row: RawImportRow = {};

  for (const [header, value] of Object.entries(input)) {
    const key = headerKey(header);
    if (!key || IGNORED_HEADER_KEYS.has(key)) continue;

    const field = FIELD_BY_HEADER_KEY[key];
    if (!field) {
      unknown.add(header);
      continue;
    }

    row[field] = String(value ?? "").trim();
  }

  return row;
}

function isBlank(row: RawImportRow): boolean {
  return Object.values(row).every((value) => !value || value.trim() === "");
}

export function parseImportFile(text: string, filename: string): ParseResult {
  const errors: string[] = [];
  const unknown = new Set<string>();

  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > MAX_IMPORT_BYTES) {
    return {
      rows: [],
      unknownColumns: [],
      errors: [
        `That file is ${(byteLength / 1024 / 1024).toFixed(1)} MB, over the ${MAX_IMPORT_BYTES / 1024 / 1024} MB limit. Please split it into smaller files.`,
      ],
    };
  }

  const isJson = filename.toLowerCase().endsWith(".json");
  let records: Record<string, unknown>[] = [];

  if (isJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      return {
        rows: [],
        unknownColumns: [],
        errors: [`That file is not valid JSON: ${(error as Error).message}`],
      };
    }

    if (!Array.isArray(parsed)) {
      return {
        rows: [],
        unknownColumns: [],
        errors: [
          "The JSON file must contain an array of records, for example [ { ... }, { ... } ].",
        ],
      };
    }

    records = parsed.filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" && entry !== null && !Array.isArray(entry),
    );

    if (records.length !== parsed.length) {
      errors.push(
        `${parsed.length - records.length} entries were skipped because they were not objects.`,
      );
    }
  } else {
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    // Papa reports recoverable quirks too, so only genuine failures are fatal.
    for (const problem of result.errors) {
      if (problem.type === "Delimiter" || problem.type === "Quotes") {
        errors.push(`Line ${(problem.row ?? 0) + 2}: ${problem.message}`);
      }
    }

    records = result.data;
  }

  const rows = records
    .map((entry) => mapRow(entry, unknown))
    .filter((row) => !isBlank(row));

  if (rows.length > MAX_IMPORT_ROWS) {
    errors.push(
      `That file has ${rows.length} rows, over the ${MAX_IMPORT_ROWS} row limit. Please split it into smaller files.`,
    );
    return { rows: [], unknownColumns: [...unknown], errors };
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No data rows were found in that file.");
  }

  return { rows, unknownColumns: [...unknown], errors };
}

/** The template offered for download on the import page. */
export const TEMPLATE_CSV = [
  "Registration Number,Cooperative Name,Account Email,COC Status,Reason for Deferment,Report Submission Status",
  "REG-0001,Example Multi-Purpose Cooperative,member@example.com,Submitted,,Submitted",
  "REG-0002,Second Example Cooperative,,Deferred,Audited financial statements outstanding,Incomplete",
  "",
].join("\n");
