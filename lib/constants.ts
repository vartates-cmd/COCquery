/**
 * Shared vocabulary for the whole app: the allowed statuses, the sheet tab
 * names, and the exact column headers.
 *
 * The header arrays are the contract with the spreadsheet. Order matters —
 * Phase 2 maps them to columns A, B, C… positionally — so reordering an array
 * here silently rewires which column a value lands in. Change the sheet and
 * this file together, never one alone.
 */

export const COC_STATUSES = [
  "Submitted",
  "For Evaluation",
  "For Compliance",
  "Approved",
  "Issued",
  "Denied",
  "Deferred",
] as const;

export type CocStatus = (typeof COC_STATUSES)[number];

/**
 * Badge styling per status. Written as complete class strings because Tailwind
 * scans source text literally — a constructed string like `bg-${colour}-100`
 * produces no CSS at all.
 *
 * Colour alone never carries the meaning: the badge always renders the status
 * word too, so this stays readable for colour-blind users and in print.
 */
export const COC_STATUS_BADGE: Record<CocStatus, string> = {
  Submitted: "bg-blue-50 text-blue-700 ring-blue-600/20",
  "For Evaluation": "bg-amber-50 text-amber-800 ring-amber-600/20",
  "For Compliance": "bg-orange-50 text-orange-800 ring-orange-600/20",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Issued: "bg-teal-50 text-teal-800 ring-teal-600/20",
  Denied: "bg-red-50 text-red-700 ring-red-600/20",
  Deferred: "bg-purple-50 text-purple-700 ring-purple-600/20",
};

/** Fallback for a status the sheet contains but this app does not recognise. */
export const UNKNOWN_STATUS_BADGE = "bg-slate-100 text-slate-700 ring-slate-500/20";

export function isCocStatus(value: unknown): value is CocStatus {
  return typeof value === "string" && (COC_STATUSES as readonly string[]).includes(value);
}

/**
 * Case-insensitive, whitespace-tolerant match back to the canonical spelling.
 * Used by the Phase 7 importer, where a CSV might say "deferred" or "APPROVED".
 */
export function normalizeCocStatus(value: string | null | undefined): CocStatus | null {
  const candidate = (value ?? "").trim().toLowerCase();
  if (!candidate) return null;
  return COC_STATUSES.find((status) => status.toLowerCase() === candidate) ?? null;
}

/** Statuses whose meaning depends on the Reason for Deferment field. */
export const STATUS_REQUIRING_REASON: CocStatus = "Deferred";

export const SHEET_TABS = {
  data: "Data",
  admins: "Admins",
  loginAttempts: "LoginAttempts",
  config: "Config",
} as const;

export const DATA_HEADERS = [
  "ID",
  "Registration Number",
  "Cooperative Name",
  "Account Email",
  "COC Status",
  "Reason for Deferment",
  "Report Submission Status",
  "Date Updated",
  "Updated By",
] as const;

export const ADMIN_HEADERS = ["Email", "Name", "Added By", "Added On"] as const;

export const LOGIN_ATTEMPT_HEADERS = [
  "Timestamp",
  "Email",
  "Name",
  "Result",
  "IP Address",
  "User Agent",
  "Reason",
] as const;

export const CONFIG_HEADERS = ["Key", "Value"] as const;

/** Values written to the Result column of LoginAttempts. */
export const LOGIN_RESULTS = ["DENIED", "ALLOWED_USER", "ALLOWED_ADMIN"] as const;
export type LoginResult = (typeof LOGIN_RESULTS)[number];

export const LOGIN_RESULT_BADGE: Record<LoginResult, string> = {
  DENIED: "bg-red-50 text-red-700 ring-red-600/20",
  ALLOWED_USER: "bg-blue-50 text-blue-700 ring-blue-600/20",
  ALLOWED_ADMIN: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

/** Cache tag revalidated after every write to the Data tab. */
export const RECORDS_CACHE_TAG = "records";
export const ADMINS_CACHE_TAG = "admins";

/** User Agent column is truncated to this many characters before writing. */
export const USER_AGENT_MAX_LENGTH = 250;
