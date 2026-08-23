import "server-only";

import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import type { GoogleSpreadsheetRow } from "google-spreadsheet";
import { DATA_HEADERS, RECORDS_CACHE_TAG, SHEET_TABS } from "@/lib/constants";
import {
  APPEND_OPTIONS,
  DataLayerError,
  getSheet,
  invalidateTag,
  SheetsError,
  withSheets,
} from "@/lib/sheets/client";

/**
 * CRUD over the `Data` tab.
 *
 * Two rules hold throughout this file:
 *
 * 1. Every mutation finds its row by scanning for the UUID at write time.
 *    Row positions shift whenever anyone sorts, inserts, or deletes in the
 *    spreadsheet, so a remembered index is a corrupted write waiting to happen.
 *
 * 2. Messy data is cleaned here and nowhere else. Callers receive trimmed
 *    strings, lowercase emails, and ISO dates, so no page or form has to
 *    second-guess what the sheet contained.
 */

export type CocRecord = {
  id: string;
  registrationNumber: string;
  cooperativeName: string;
  accountEmail: string;
  cocStatus: string;
  reasonForDeferment: string;
  reportSubmissionStatus: string;
  dateUpdated: string;
  updatedBy: string;
};

/** The fields a human supplies. Identity and audit columns are set by this module. */
export type RecordInput = {
  registrationNumber: string;
  cooperativeName: string;
  accountEmail: string;
  cocStatus: string;
  reasonForDeferment: string;
  reportSubmissionStatus: string;
};

const H = {
  id: DATA_HEADERS[0],
  registrationNumber: DATA_HEADERS[1],
  cooperativeName: DATA_HEADERS[2],
  accountEmail: DATA_HEADERS[3],
  cocStatus: DATA_HEADERS[4],
  reasonForDeferment: DATA_HEADERS[5],
  reportSubmissionStatus: DATA_HEADERS[6],
  dateUpdated: DATA_HEADERS[7],
  updatedBy: DATA_HEADERS[8],
} as const;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function email(value: unknown): string {
  return text(value).toLowerCase();
}

/** Today in YYYY-MM-DD, in local time — the office's calendar day, not UTC's. */
function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Coerce whatever the sheet holds into YYYY-MM-DD. A cell formatted as a date,
 * typed by hand, or left blank all pass through here. An unparseable value is
 * returned as-is rather than mangled into a wrong date.
 */
function toIsoDate(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

function toRecord(row: GoogleSpreadsheetRow): CocRecord {
  return {
    id: text(row.get(H.id)),
    registrationNumber: text(row.get(H.registrationNumber)),
    cooperativeName: text(row.get(H.cooperativeName)),
    accountEmail: email(row.get(H.accountEmail)),
    cocStatus: text(row.get(H.cocStatus)),
    reasonForDeferment: text(row.get(H.reasonForDeferment)),
    reportSubmissionStatus: text(row.get(H.reportSubmissionStatus)),
    dateUpdated: toIsoDate(row.get(H.dateUpdated)),
    updatedBy: email(row.get(H.updatedBy)),
  };
}

/** Compare registration numbers the way a person would: case and spacing agnostic. */
function sameRegNo(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Uncached read. Mutations use this so they act on the sheet as it is right
 * now, not on a cached snapshot up to 30 seconds stale.
 */
async function readRowsFresh(): Promise<GoogleSpreadsheetRow[]> {
  return withSheets(async () => {
    const sheet = await getSheet(SHEET_TABS.data);
    return sheet.getRows();
  });
}

/**
 * Cached read of the whole tab.
 *
 * Caching the full dataset rather than per-user slices is deliberate: a cache
 * keyed by email is one key-construction bug away from serving one
 * cooperative's records to another. Scoping happens after the read, in
 * getRecordsByEmail, on the server.
 *
 * 30 seconds is short enough that a manual edit in the spreadsheet shows up
 * quickly, and long enough to keep normal browsing far below the ~60
 * reads/minute quota.
 */
export const listRecords = unstable_cache(
  async (): Promise<CocRecord[]> => {
    const rows = await readRowsFresh();
    return rows
      .map(toRecord)
      .filter((record) => record.id || record.registrationNumber);
  },
  ["records-list"],
  { tags: [RECORDS_CACHE_TAG], revalidate: 30 },
);

export async function getRecordById(id: string): Promise<CocRecord | null> {
  const wanted = text(id);
  if (!wanted) return null;
  const records = await listRecords();
  return records.find((record) => record.id === wanted) ?? null;
}

/**
 * The user dashboard's only data source. Matching is case-insensitive and
 * trimmed because the email in the sheet is typed by hand.
 *
 * A blank argument returns nothing rather than every record whose Account
 * Email cell is empty — those are admin-only rows, and an empty session email
 * must never match them.
 */
export async function getRecordsByEmail(address: string): Promise<CocRecord[]> {
  const wanted = email(address);
  if (!wanted) return [];
  const records = await listRecords();
  return records.filter((record) => record.accountEmail === wanted);
}

export async function findByRegistrationNumber(
  regNo: string,
): Promise<CocRecord | null> {
  const wanted = text(regNo);
  if (!wanted) return null;
  const records = await listRecords();
  return (
    records.find((record) => sameRegNo(record.registrationNumber, wanted)) ??
    null
  );
}

function rowPayload(input: RecordInput, actorEmail: string, id: string) {
  return {
    [H.id]: id,
    [H.registrationNumber]: text(input.registrationNumber),
    [H.cooperativeName]: text(input.cooperativeName),
    [H.accountEmail]: email(input.accountEmail),
    [H.cocStatus]: text(input.cocStatus),
    [H.reasonForDeferment]: text(input.reasonForDeferment),
    [H.reportSubmissionStatus]: text(input.reportSubmissionStatus),
    [H.dateUpdated]: today(),
    [H.updatedBy]: email(actorEmail),
  };
}

export class DuplicateRegistrationError extends DataLayerError {
  readonly registrationNumber: string;

  constructor(registrationNumber: string) {
    super(`Registration number "${registrationNumber}" already exists`);
    this.name = "DuplicateRegistrationError";
    this.registrationNumber = registrationNumber;
  }
}

export async function createRecord(
  input: RecordInput,
  actorEmail: string,
): Promise<CocRecord> {
  const regNo = text(input.registrationNumber);

  return withSheets(async () => {
    const sheet = await getSheet(SHEET_TABS.data);

    // Checked against a fresh read, not the cache — otherwise two creates
    // inside the same 30-second window could both believe they are unique.
    const rows = await sheet.getRows();
    const clash = rows.some((row) =>
      sameRegNo(text(row.get(H.registrationNumber)), regNo),
    );
    if (clash) throw new DuplicateRegistrationError(regNo);

    const id = randomUUID();
    await sheet.addRow(rowPayload(input, actorEmail, id), APPEND_OPTIONS);

    invalidateTag(RECORDS_CACHE_TAG);
    return { ...toRecordFromInput(input, actorEmail, id) };
  });
}

function toRecordFromInput(
  input: RecordInput,
  actorEmail: string,
  id: string,
): CocRecord {
  return {
    id,
    registrationNumber: text(input.registrationNumber),
    cooperativeName: text(input.cooperativeName),
    accountEmail: email(input.accountEmail),
    cocStatus: text(input.cocStatus),
    reasonForDeferment: text(input.reasonForDeferment),
    reportSubmissionStatus: text(input.reportSubmissionStatus),
    dateUpdated: today(),
    updatedBy: email(actorEmail),
  };
}

export async function updateRecord(
  id: string,
  input: RecordInput,
  actorEmail: string,
): Promise<CocRecord> {
  const wanted = text(id);
  const regNo = text(input.registrationNumber);

  return withSheets(async () => {
    const sheet = await getSheet(SHEET_TABS.data);
    const rows = await sheet.getRows();

    const row = rows.find((candidate) => text(candidate.get(H.id)) === wanted);
    if (!row) {
      throw new SheetsError(
        "not_found",
        `No row with ID ${wanted} in the ${SHEET_TABS.data} tab`,
        "That record no longer exists. It may have been deleted.",
      );
    }

    // A different row already using this registration number is a conflict;
    // the record keeping its own number is not.
    const clash = rows.some(
      (candidate) =>
        text(candidate.get(H.id)) !== wanted &&
        sameRegNo(text(candidate.get(H.registrationNumber)), regNo),
    );
    if (clash) throw new DuplicateRegistrationError(regNo);

    const payload = rowPayload(input, actorEmail, wanted);
    for (const [header, value] of Object.entries(payload)) {
      row.set(header, value);
    }
    await row.save();

    invalidateTag(RECORDS_CACHE_TAG);
    return toRecord(row);
  });
}

export async function deleteRecord(id: string): Promise<void> {
  const wanted = text(id);

  return withSheets(async () => {
    const rows = await readRowsFresh();
    const row = rows.find((candidate) => text(candidate.get(H.id)) === wanted);

    if (!row) {
      throw new SheetsError(
        "not_found",
        `No row with ID ${wanted} to delete`,
        "That record no longer exists. It may have already been deleted.",
      );
    }

    await row.delete();
    invalidateTag(RECORDS_CACHE_TAG);
  });
}

/**
 * One batched append for the whole import, not a write per row. A loop would
 * burn the write quota and take long enough to hit the serverless time limit
 * partway through, leaving a half-imported sheet.
 *
 * Duplicate checking is the caller's job — Phase 7 needs to report per-row
 * outcomes before anything is written, which this function cannot do.
 */
export async function bulkCreateRecords(
  inputs: RecordInput[],
  actorEmail: string,
): Promise<CocRecord[]> {
  if (inputs.length === 0) return [];

  return withSheets(async () => {
    const sheet = await getSheet(SHEET_TABS.data);

    const created = inputs.map((input) => ({
      input,
      id: randomUUID(),
    }));

    await sheet.addRows(
      created.map(({ input, id }) => rowPayload(input, actorEmail, id)),
      APPEND_OPTIONS,
    );

    invalidateTag(RECORDS_CACHE_TAG);
    return created.map(({ input, id }) =>
      toRecordFromInput(input, actorEmail, id),
    );
  });
}

/** Force the next read to hit the API. Call after writing outside this module. */
export function invalidateRecords(): void {
  invalidateTag(RECORDS_CACHE_TAG);
}

/**
 * Applies many updates in a single write.
 *
 * Saving each row individually would be one API call per row — fine for three
 * rows, a quota breach and a serverless timeout for three hundred. Instead the
 * affected span of cells is loaded once, edited in memory, and saved in one
 * request.
 *
 * Rows whose UUID is no longer present are skipped rather than treated as an
 * error: the import preview may have been built moments before someone else
 * deleted a record, and losing the whole batch over that would be worse.
 *
 * Returns the number of rows actually written.
 */
export async function bulkUpdateRecords(
  updates: { id: string; input: RecordInput }[],
  actorEmail: string,
): Promise<number> {
  if (updates.length === 0) return 0;

  return withSheets(async () => {
    const sheet = await getSheet(SHEET_TABS.data);
    const rows = await sheet.getRows();

    const byId = new Map<string, GoogleSpreadsheetRow>();
    for (const row of rows) byId.set(text(row.get(H.id)), row);

    const targets = updates
      .map((update) => ({
        input: update.input,
        row: byId.get(text(update.id)),
      }))
      .filter(
        (target): target is { input: RecordInput; row: GoogleSpreadsheetRow } =>
          Boolean(target.row),
      );

    if (targets.length === 0) return 0;

    const rowNumbers = targets.map((target) => target.row.rowNumber);
    const firstRow = Math.min(...rowNumbers);
    const lastRow = Math.max(...rowNumbers);
    const lastColumn = String.fromCharCode(
      "A".charCodeAt(0) + DATA_HEADERS.length - 1,
    );

    await sheet.loadCells(`A${firstRow}:${lastColumn}${lastRow}`);

    const stamp = today();
    const actor = email(actorEmail);

    for (const { row, input } of targets) {
      const rowIndex = row.rowNumber - 1;

      // Index 0 is ID, deliberately never written: the identity of an existing
      // row must survive an import untouched.
      const columnValues: (string | undefined)[] = [
        undefined,
        text(input.registrationNumber),
        text(input.cooperativeName),
        email(input.accountEmail),
        text(input.cocStatus),
        text(input.reasonForDeferment),
        text(input.reportSubmissionStatus),
        stamp,
        actor,
      ];

      columnValues.forEach((value, columnIndex) => {
        if (value === undefined) return;
        sheet.getCell(rowIndex, columnIndex).value = value;
      });
    }

    await sheet.saveUpdatedCells();
    invalidateTag(RECORDS_CACHE_TAG);
    return targets.length;
  });
}
