import { env } from "@/lib/env";
import { isAdminEmail } from "@/lib/sheets/admins";
import { getRecordsByEmail } from "@/lib/sheets/records";

export type Role = "admin" | "user" | "denied";

/**
 * Why a role came out the way it did. This string is written verbatim into the
 * `Reason` column of the LoginAttempts tab, so keep the values stable — the
 * Phase 8 log viewer filters on them.
 */
export type RoleReason =
  | "BOOTSTRAP_ADMIN"
  | "ADMINS_TAB"
  | "EMAIL_MAPPED_TO_RECORD"
  | "EMAIL_NOT_MAPPED"
  | "NO_EMAIL_FROM_GOOGLE";

export type RoleResolution = { role: Role; reason: RoleReason };

/** Single place where email casing/whitespace is decided. Everything compares post-normalisation. */
export function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function bootstrapAdminEmails(): string[] {
  return env.BOOTSTRAP_ADMIN_EMAILS.split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isBootstrapAdmin(email: string): boolean {
  return bootstrapAdminEmails().includes(normalizeEmail(email));
}

/**
 * The access decision for the whole app.
 *
 * Order matters: bootstrap admins are checked before any Sheets call, so the
 * people who own the deployment can still get in when the spreadsheet is
 * unreachable, unshared, or over quota.
 *
 * Throws if the Sheets lookups fail. Callers must decide what a failure means —
 * this function will not guess, because guessing here means either locking out
 * a legitimate admin or letting in a stranger.
 */
export async function resolveRole(
  rawEmail?: string | null,
): Promise<RoleResolution> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { role: "denied", reason: "NO_EMAIL_FROM_GOOGLE" };

  if (isBootstrapAdmin(email))
    return { role: "admin", reason: "BOOTSTRAP_ADMIN" };
  if (await isAdminEmail(email)) return { role: "admin", reason: "ADMINS_TAB" };

  const records = await getRecordsByEmail(email);
  if (records.length > 0)
    return { role: "user", reason: "EMAIL_MAPPED_TO_RECORD" };

  return { role: "denied", reason: "EMAIL_NOT_MAPPED" };
}

/** Where a signed-in account belongs. Used by the landing page and by sign-in redirects. */
export function homePathForRole(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "user") return "/dashboard";
  return "/access-denied";
}
