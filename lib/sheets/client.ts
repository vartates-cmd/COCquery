import "server-only";

import { GoogleSpreadsheet } from "google-spreadsheet";
import type { GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { revalidateTag, updateTag } from "next/cache";
import { env } from "@/lib/env";

/**
 * The only module in the app that holds Google credentials.
 *
 * The `server-only` import at the top is a build-time tripwire: if any client
 * component ever ends up importing this file, even transitively, the build
 * fails instead of shipping a service-account key to a browser.
 */

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/**
 * Every append MUST pass this.
 *
 * The library's default append uses the Sheets API's OVERWRITE data option.
 * Against this spreadsheet — which has ~1000 allocated but empty rows — a
 * second append lands on the row the first one just wrote, silently destroying
 * it. Measured, not assumed: two consecutive addRow calls left one row.
 *
 * `insert: true` switches to INSERT_ROWS, which adds a genuinely new row.
 * A single batched addRows([a, b]) call happens to be safe on its own, but is
 * still unsafe as the *second* append in a request, so this is applied
 * everywhere rather than case by case.
 */
export const APPEND_OPTIONS = { insert: true } as const;

export type SheetsErrorKind =
  | "forbidden"
  | "rate_limited"
  | "auth"
  | "missing_tab"
  | "not_found"
  | "unknown";

/**
 * A Sheets failure translated into something a person can act on.
 *
 * `message` keeps the underlying detail for the server log; `userMessage` is
 * safe to render. Phase 10 error boundaries read `userMessage` — nothing that
 * reaches a browser should mention spreadsheets, quotas, or service accounts.
 */
/**
 * Base class for every error this data layer raises on purpose.
 *
 * `withSheets` rethrows these untouched. Without it, a deliberate
 * DuplicateRegistrationError thrown inside a wrapped operation was being
 * caught and reclassified as an anonymous "unknown" Sheets failure, so callers
 * could never tell a duplicate from a network fault.
 */
export class DataLayerError extends Error {}

export class SheetsError extends DataLayerError {
  readonly kind: SheetsErrorKind;
  readonly userMessage: string;

  constructor(kind: SheetsErrorKind, message: string, userMessage: string) {
    super(message);
    this.name = "SheetsError";
    this.kind = kind;
    this.userMessage = userMessage;
  }
}

function classify(error: unknown): SheetsError {
  const err = error as {
    response?: { status?: number };
    message?: string;
    code?: string;
  };
  const status = err?.response?.status;
  const message = String(err?.message ?? error);

  if (status === 403) {
    return new SheetsError(
      "forbidden",
      `403 from Sheets — is the spreadsheet shared with ${env.GOOGLE_SERVICE_ACCOUNT_EMAIL}? (${message})`,
      "The system cannot reach its records right now. Please contact the office.",
    );
  }

  if (status === 429 || err?.code === "429") {
    return new SheetsError(
      "rate_limited",
      `429 from Sheets — request quota exceeded. (${message})`,
      "The system is busy. Please try again in a moment.",
    );
  }

  if (status === 404) {
    return new SheetsError(
      "not_found",
      `404 from Sheets — GOOGLE_SHEET_ID may be wrong. (${message})`,
      "The system cannot reach its records right now. Please contact the office.",
    );
  }

  if (message.includes("invalid_grant") || message.includes("Invalid JWT")) {
    return new SheetsError(
      "auth",
      `Service account failed to authenticate — check GOOGLE_PRIVATE_KEY newline escaping. (${message})`,
      "The system cannot reach its records right now. Please contact the office.",
    );
  }

  return new SheetsError(
    "unknown",
    message,
    "Something went wrong. Please try again.",
  );
}

/**
 * Runs a Sheets operation and converts any failure into a SheetsError.
 * Every exported function in lib/sheets/ goes through this, so callers never
 * see a raw Google API error.
 */
export async function withSheets<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DataLayerError) throw error;
    const wrapped = classify(error);
    console.error(`[sheets] ${wrapped.kind}: ${wrapped.message}`);
    throw wrapped;
  }
}

/**
 * Memoised per serverless invocation. `loadInfo()` costs a round trip, so
 * holding the instance saves one API call per request — which matters against
 * a 60-reads-per-minute quota. Row data is never cached here; every read still
 * goes to the API.
 */
let docPromise: Promise<GoogleSpreadsheet> | null = null;

async function connect(): Promise<GoogleSpreadsheet> {
  const jwt = new JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // env.ts has already turned the escaped \n sequences back into real newlines.
    key: env.GOOGLE_PRIVATE_KEY,
    scopes: SCOPES,
  });

  const doc = new GoogleSpreadsheet(env.GOOGLE_SHEET_ID, jwt);
  await doc.loadInfo();
  return doc;
}

export async function getDoc(): Promise<GoogleSpreadsheet> {
  if (!docPromise) {
    // Store the promise, not the resolved value, so concurrent callers during
    // a cold start share one connection instead of racing to make three.
    docPromise = withSheets(connect).catch((error) => {
      // A failed connection must not be memoised, or one transient outage
      // would poison every later request in this instance.
      docPromise = null;
      throw error;
    });
  }
  return docPromise;
}

export async function getSheet(
  title: string,
): Promise<GoogleSpreadsheetWorksheet> {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle[title];

  if (!sheet) {
    throw new SheetsError(
      "missing_tab",
      `Spreadsheet has no tab named "${title}". Found: ${doc.sheetsByIndex.map((s) => s.title).join(", ")}`,
      "The system cannot reach its records right now. Please contact the office.",
    );
  }

  return sheet;
}

/** Escape hatch for tests and scripts that need to force a fresh connection. */
export function resetConnection(): void {
  docPromise = null;
}

/**
 * Invalidate a cache tag after a write.
 *
 * Next 16 offers two, and the difference matters here:
 *   - `updateTag` expires immediately, so an admin who just saved sees their
 *     own change on the very next render. It only works inside a Server Action.
 *   - `revalidateTag(tag, "max")` is stale-while-revalidate — the next visitor
 *     is served the OLD value while fresh data loads behind them. Acceptable
 *     as a fallback, wrong as the default for someone who just clicked Save.
 *
 * Mutations here are called from Server Actions in normal use and from route
 * handlers in tests and debug tooling, so we prefer the strict one and fall
 * back rather than forcing every caller to know which context it is in.
 */
export function invalidateTag(tag: string): void {
  try {
    updateTag(tag);
  } catch {
    revalidateTag(tag, "max");
  }
}
