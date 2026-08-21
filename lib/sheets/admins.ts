import "server-only";

import { unstable_cache } from "next/cache";
import { ADMIN_HEADERS, ADMINS_CACHE_TAG, SHEET_TABS } from "@/lib/constants";
import {
  APPEND_OPTIONS,
  DataLayerError,
  getSheet,
  invalidateTag,
  SheetsError,
  withSheets,
} from "@/lib/sheets/client";

/**
 * Read/write access to the `Admins` tab.
 *
 * Bootstrap admins from the env var are NOT here — they live in lib/roles.ts
 * and are checked before this module is ever consulted, so the deployment
 * owners can still sign in when the spreadsheet is unreachable.
 */

export type AdminRow = {
  email: string;
  name: string;
  addedBy: string;
  addedOn: string;
};

const H = {
  email: ADMIN_HEADERS[0],
  name: ADMIN_HEADERS[1],
  addedBy: ADMIN_HEADERS[2],
  addedOn: ADMIN_HEADERS[3],
} as const;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function email(value: unknown): string {
  return text(value).toLowerCase();
}

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Cached for 30 seconds and tagged, same reasoning as the records list.
 *
 * This is read on every sign-in and on every role re-check, so an uncached
 * version would put the app's busiest code path straight against the quota.
 */
export const listAdmins = unstable_cache(
  async (): Promise<AdminRow[]> => {
    return withSheets(async () => {
      const sheet = await getSheet(SHEET_TABS.admins);
      const rows = await sheet.getRows();

      return rows
        .map((row) => ({
          email: email(row.get(H.email)),
          name: text(row.get(H.name)),
          addedBy: email(row.get(H.addedBy)),
          addedOn: text(row.get(H.addedOn)),
        }))
        .filter((admin) => admin.email.length > 0);
    });
  },
  ["admins-list"],
  { tags: [ADMINS_CACHE_TAG], revalidate: 30 },
);

/**
 * The membership check used during sign-in. A blank argument is false rather
 * than matching the empty cells of an unused row.
 */
export async function isAdminEmail(address: string): Promise<boolean> {
  const wanted = email(address);
  if (!wanted) return false;
  const admins = await listAdmins();
  return admins.some((admin) => admin.email === wanted);
}

export class DuplicateAdminError extends DataLayerError {
  constructor(address: string) {
    super(`${address} is already an admin`);
    this.name = "DuplicateAdminError";
  }
}

export async function addAdmin(
  address: string,
  name: string,
  actorEmail: string,
): Promise<AdminRow> {
  const wanted = email(address);

  return withSheets(async () => {
    const sheet = await getSheet(SHEET_TABS.admins);

    // Fresh read, not the cache: two admins adding the same person seconds
    // apart should not both succeed.
    const rows = await sheet.getRows();
    if (rows.some((row) => email(row.get(H.email)) === wanted)) {
      throw new DuplicateAdminError(wanted);
    }

    const entry: AdminRow = {
      email: wanted,
      name: text(name),
      addedBy: email(actorEmail),
      addedOn: today(),
    };

    await sheet.addRow(
      {
        [H.email]: entry.email,
        [H.name]: entry.name,
        [H.addedBy]: entry.addedBy,
        [H.addedOn]: entry.addedOn,
      },
      APPEND_OPTIONS,
    );

    invalidateTag(ADMINS_CACHE_TAG);
    return entry;
  });
}

/**
 * Removes an admin row.
 *
 * The Phase 9 safety rules — no self-removal, no removing the last admin —
 * are deliberately NOT enforced here. They need to know who is asking and
 * whether bootstrap admins exist, which is the caller's context. This function
 * does exactly what it is told.
 */
export async function removeAdmin(address: string): Promise<void> {
  const wanted = email(address);

  return withSheets(async () => {
    const sheet = await getSheet(SHEET_TABS.admins);
    const rows = await sheet.getRows();
    const row = rows.find(
      (candidate) => email(candidate.get(H.email)) === wanted,
    );

    if (!row) {
      throw new SheetsError(
        "not_found",
        `No admin row for ${wanted}`,
        "That administrator is no longer listed.",
      );
    }

    await row.delete();
    invalidateTag(ADMINS_CACHE_TAG);
  });
}

/** Force the next admin read to hit the API. */
export function invalidateAdmins(): void {
  invalidateTag(ADMINS_CACHE_TAG);
}
