import "server-only";

import { SheetsError, type SheetsErrorKind } from "@/lib/sheets/client";

/**
 * Turns a known data-layer failure into something a page can render.
 *
 * The split matters. A SheetsError is a failure we *understand* — the sheet is
 * unshared, the quota is spent, the tab is missing — and each one already
 * carries wording written for a person. Those should reach the reader intact.
 *
 * Anything else is a bug we did not foresee, so it is rethrown and left to the
 * error.tsx boundary, which apologises generically. Catching everything here
 * would flatten real bugs into a polite shrug and make them very hard to find.
 *
 * This exists because an error boundary cannot do the job on its own: in
 * production Next.js strips server error messages before they reach the client,
 * so "the system is busy, try again in a moment" would never survive the trip.
 */

export type Loaded<T> =
  { ok: true; data: T } | { ok: false; message: string; kind: SheetsErrorKind };

export async function load<T>(work: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (error instanceof SheetsError) {
      return { ok: false, message: error.userMessage, kind: error.kind };
    }
    throw error;
  }
}
