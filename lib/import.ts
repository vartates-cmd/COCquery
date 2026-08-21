import { normalizeCocStatus, STATUS_REQUIRING_REASON } from "@/lib/constants";
import { recordSchema } from "@/lib/schema";
import type { RawImportRow } from "@/lib/csv";
import type { CocRecord, RecordInput } from "@/lib/sheets/records";

/**
 * Decides what an import would do, without doing any of it.
 *
 * The plan is built twice: once to show the admin a preview, and again at
 * commit time against a fresh read of the sheet. Re-planning matters — someone
 * may have added a record in between, and the second pass is the one that
 * decides what is actually written.
 */

export type DuplicateStrategy = "skip" | "update";

export type RowState = "new" | "update" | "skip" | "error";

export type PlannedRow = {
  /** Line number as the admin sees it in their file, counting the header row. */
  line: number;
  state: RowState;
  registrationNumber: string;
  cooperativeName: string;
  cocStatus: string;
  problems: string[];
  /** Present when the row is going to be written. */
  input?: RecordInput;
  /** Present for rows matching an existing record. */
  existingId?: string;
};

export type ImportPlan = {
  rows: PlannedRow[];
  counts: { create: number; update: number; skip: number; error: number };
};

function normalizeRegNo(value: string): string {
  return value.trim().toLowerCase();
}

export function buildImportPlan(
  rawRows: RawImportRow[],
  existing: CocRecord[],
  strategy: DuplicateStrategy,
): ImportPlan {
  const existingByRegNo = new Map<string, CocRecord>();
  for (const record of existing) {
    const key = normalizeRegNo(record.registrationNumber);
    if (key) existingByRegNo.set(key, record);
  }

  // Which file line first claimed a registration number, so the message can
  // point at the original rather than just saying "duplicate".
  const seenInFile = new Map<string, number>();

  const rows: PlannedRow[] = rawRows.map((raw, index) => {
    const line = index + 2; // +1 for zero-index, +1 for the header row
    const problems: string[] = [];

    const registrationNumber = (raw.registrationNumber ?? "").trim();
    const cooperativeName = (raw.cooperativeName ?? "").trim();
    const rawStatus = (raw.cocStatus ?? "").trim();

    // Accept "deferred" or "APPROVED" and store the canonical spelling.
    const status = normalizeCocStatus(rawStatus);
    if (rawStatus && !status) {
      problems.push(`"${rawStatus}" is not a recognised COC status`);
    }

    const candidate = {
      registrationNumber,
      cooperativeName,
      accountEmail: (raw.accountEmail ?? "").trim(),
      cocStatus: status ?? rawStatus,
      reasonForDeferment: (raw.reasonForDeferment ?? "").trim(),
      reportSubmissionStatus: (raw.reportSubmissionStatus ?? "").trim(),
    };

    const parsed = recordSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const message = issue.message;
        if (!problems.includes(message)) problems.push(message);
      }
    }

    const base: PlannedRow = {
      line,
      state: "error",
      registrationNumber,
      cooperativeName,
      cocStatus: status ?? rawStatus,
      problems,
    };

    if (problems.length > 0) return base;

    const key = normalizeRegNo(registrationNumber);

    const firstSeen = seenInFile.get(key);
    if (firstSeen !== undefined) {
      return {
        ...base,
        problems: [`Duplicate of line ${firstSeen} in this file`],
      };
    }
    seenInFile.set(key, line);

    const match = existingByRegNo.get(key);
    if (!match) {
      return { ...base, state: "new", input: parsed.data };
    }

    if (strategy === "update") {
      return {
        ...base,
        state: "update",
        input: parsed.data,
        existingId: match.id,
        problems: [`Updates the existing record for ${match.cooperativeName || registrationNumber}`],
      };
    }

    return {
      ...base,
      state: "skip",
      existingId: match.id,
      problems: [`Already in the register — left unchanged`],
    };
  });

  const counts = { create: 0, update: 0, skip: 0, error: 0 };
  for (const row of rows) {
    if (row.state === "new") counts.create++;
    else if (row.state === "update") counts.update++;
    else if (row.state === "skip") counts.skip++;
    else counts.error++;
  }

  return { rows, counts };
}

/**
 * A row's deferment reason is required by the schema, but the schema cannot
 * explain *why* in the preview. Used for the on-page guidance.
 */
export const IMPORT_RULES = [
  "Registration Number and Cooperative Name are required on every row.",
  `COC Status must be one of the seven allowed values (case does not matter).`,
  `Reason for Deferment is required when COC Status is ${STATUS_REQUIRING_REASON}.`,
  "Account Email may be left blank for a record only administrators should see.",
  "ID, Date Updated and Updated By are ignored — the app sets them.",
] as const;
