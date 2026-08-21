import "server-only";

import {
  LOGIN_ATTEMPT_HEADERS,
  SHEET_TABS,
  USER_AGENT_MAX_LENGTH,
} from "@/lib/constants";
import type { LoginResult } from "@/lib/constants";
import { APPEND_OPTIONS, getSheet, withSheets } from "@/lib/sheets/client";

/**
 * Append-only audit log of sign-in attempts.
 *
 * Nothing here is cached. A log the admin cannot trust to be current is worse
 * than no log, and writes are rare — one per sign-in, not one per page view.
 */

export type LoginAttempt = {
  timestamp: string;
  email: string;
  name: string;
  result: LoginResult;
  reason: string;
  ip: string;
  userAgent: string;
};

const H = {
  timestamp: LOGIN_ATTEMPT_HEADERS[0],
  email: LOGIN_ATTEMPT_HEADERS[1],
  name: LOGIN_ATTEMPT_HEADERS[2],
  result: LOGIN_ATTEMPT_HEADERS[3],
  ip: LOGIN_ATTEMPT_HEADERS[4],
  userAgent: LOGIN_ATTEMPT_HEADERS[5],
  reason: LOGIN_ATTEMPT_HEADERS[6],
} as const;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * Writes one row to the LoginAttempts tab.
 *
 * This throws on failure. lib/auth.ts deliberately swallows that, because a
 * log write that fails must not stop a legitimate person signing in.
 */
export async function logLoginAttempt(attempt: LoginAttempt): Promise<void> {
  return withSheets(async () => {
    const sheet = await getSheet(SHEET_TABS.loginAttempts);

    await sheet.addRow(
      {
        [H.timestamp]: text(attempt.timestamp) || new Date().toISOString(),
        [H.email]: text(attempt.email).toLowerCase(),
        [H.name]: text(attempt.name),
        [H.result]: attempt.result,
        [H.ip]: text(attempt.ip) || "unknown",
        // Truncated because user-agent strings are long, the column is only for
        // recognising a device, and a 1 KB cell per sign-in adds up.
        [H.userAgent]:
          text(attempt.userAgent).slice(0, USER_AGENT_MAX_LENGTH) || "unknown",
        [H.reason]: text(attempt.reason),
      },
      APPEND_OPTIONS,
    );
  });
}

/**
 * Whole log, newest first. Phase 8 filters and paginates on top of this.
 *
 * This tab grows without bound — one row per sign-in attempt, forever. At a
 * few thousand rows it is fine; well beyond that the read gets slow enough to
 * be worth archiving older rows to a separate sheet.
 */
export async function listLoginAttempts(): Promise<LoginAttempt[]> {
  return withSheets(async () => {
    const sheet = await getSheet(SHEET_TABS.loginAttempts);
    const rows = await sheet.getRows();

    return rows
      .map((row) => ({
        timestamp: text(row.get(H.timestamp)),
        email: text(row.get(H.email)).toLowerCase(),
        name: text(row.get(H.name)),
        result: text(row.get(H.result)) as LoginResult,
        reason: text(row.get(H.reason)),
        ip: text(row.get(H.ip)),
        userAgent: text(row.get(H.userAgent)),
      }))
      .filter((attempt) => attempt.timestamp || attempt.email)
      .reverse();
  });
}
