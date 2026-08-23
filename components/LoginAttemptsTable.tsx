"use client";

import { useActionState, useMemo, useState } from "react";
import { formatDistance } from "date-fns";
import { LOGIN_RESULT_BADGE, type LoginResult } from "@/lib/constants";
import { addAdminAction, type AddAdminState } from "@/lib/actions/admins";
import type { LoginAttempt } from "@/lib/sheets/attempts";

const PAGE_SIZE = 50;
const ADD_ADMIN_EMPTY: AddAdminState = { ok: false };

type ResultFilter = "all" | "denied" | "allowed";

function timeOf(attempt: LoginAttempt): number {
  const time = new Date(attempt.timestamp).getTime();
  return Number.isFinite(time) ? time : 0;
}

/** YYYY-MM-DD portion, for comparing against the date inputs. */
function dayOf(attempt: LoginAttempt): string {
  return attempt.timestamp.slice(0, 10);
}

function csvCell(value: string): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function LoginAttemptsTable({
  attempts,
  adminEmails,
  deniedLast24h,
  now,
}: {
  attempts: LoginAttempt[];
  /** Already administrators — no point offering to add them again. */
  adminEmails: string[];
  /** Counted on the server; see the note on `now`. */
  deniedLast24h: number;
  /**
   * The moment the page was rendered, supplied by the server.
   *
   * Anything time-relative has to come from one fixed reference. Calling
   * Date.now() during render would produce one answer on the server and a
   * different one at hydration, which React reports as a mismatch — and would
   * make "3 minutes ago" quietly disagree with itself.
   */
  now: number;
}) {
  const [result, setResult] = useState<ResultFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [addState, addAction, addPending] = useActionState(
    addAdminAction,
    ADD_ADMIN_EMPTY,
  );

  const adminSet = useMemo(
    () => new Set(adminEmails.map((email) => email.trim().toLowerCase())),
    [adminEmails],
  );

  const sorted = useMemo(
    () => [...attempts].sort((a, b) => timeOf(b) - timeOf(a)),
    [attempts],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return sorted.filter((attempt) => {
      if (result === "denied" && attempt.result !== "DENIED") return false;
      if (result === "allowed" && attempt.result === "DENIED") return false;

      const day = dayOf(attempt);
      if (from && day < from) return false;
      if (to && day > to) return false;

      if (
        needle &&
        !`${attempt.email} ${attempt.name}`.toLowerCase().includes(needle)
      )
        return false;
      return true;
    });
  }, [sorted, result, from, to, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function exportCsv() {
    const header = [
      "Timestamp",
      "Email",
      "Name",
      "Result",
      "IP Address",
      "Reason",
      "User Agent",
    ];
    const body = filtered.map((a) =>
      [a.timestamp, a.email, a.name, a.result, a.ip, a.reason, a.userAgent]
        .map(csvCell)
        .join(","),
    );
    const csv = [header.map(csvCell).join(","), ...body].join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `login-attempts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-5">
      <div
        className={`rounded-xl border p-4 ${
          deniedLast24h > 0
            ? "border-red-200 bg-red-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <p className="text-xs font-medium tracking-wide text-slate-600 uppercase">
          Denied sign-ins, last 24 hours
        </p>
        <p
          className={`mt-1 text-3xl font-semibold ${
            deniedLast24h > 0 ? "text-red-800" : "text-slate-900"
          }`}
        >
          {deniedLast24h}
        </p>
        {deniedLast24h > 0 ? (
          <p className="mt-1 text-sm text-red-800">
            Each one is someone who could not get in. If they should have
            access, add their email to a record, or make them an administrator
            below.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label
            htmlFor="result-filter"
            className="block text-sm font-medium text-slate-700"
          >
            Result
          </label>
          <select
            id="result-filter"
            value={result}
            onChange={(e) => {
              setResult(e.target.value as ResultFilter);
              resetPage();
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
          >
            <option value="all">All attempts</option>
            <option value="denied">Denied only</option>
            <option value="allowed">Allowed only</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="attempt-search"
            className="block text-sm font-medium text-slate-700"
          >
            Email or name
          </label>
          <input
            id="attempt-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="from-date"
            className="block text-sm font-medium text-slate-700"
          >
            From
          </label>
          <input
            id="from-date"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              resetPage();
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="to-date"
            className="block text-sm font-medium text-slate-700"
          >
            To
          </label>
          <input
            id="to-date"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              resetPage();
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500" aria-live="polite">
          {filtered.length} of {attempts.length} attempts
          {pageCount > 1 ? ` · page ${currentPage} of ${pageCount}` : ""}
        </p>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {addState.message ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            addState.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {addState.message}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No sign-in attempts match those filters.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-600 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    When
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Result
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    IP
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Reason
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((attempt, index) => (
                  <tr key={`${attempt.timestamp}-${attempt.email}-${index}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="block text-xs text-slate-900">
                        {attempt.timestamp.replace("T", " ").slice(0, 19)}
                      </span>
                      {timeOf(attempt) > 0 ? (
                        <span className="block text-xs text-slate-500">
                          {formatDistance(
                            new Date(attempt.timestamp),
                            new Date(now),
                            {
                              addSuffix: true,
                            },
                          )}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{attempt.email || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {attempt.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ResultBadge result={attempt.result} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {attempt.ip || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {attempt.reason || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AddAdminButton
                        attempt={attempt}
                        alreadyAdmin={adminSet.has(attempt.email)}
                        action={addAction}
                        pending={addPending}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {visible.map((attempt, index) => (
              <li
                key={`${attempt.timestamp}-${attempt.email}-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {attempt.email || "—"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {attempt.name || "—"}
                    </p>
                  </div>
                  <ResultBadge result={attempt.result} />
                </div>
                <dl className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex gap-2">
                    <dt className="text-slate-500">When:</dt>
                    <dd>{attempt.timestamp.replace("T", " ").slice(0, 19)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-500">IP:</dt>
                    <dd className="font-mono">{attempt.ip || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Reason:</dt>
                    <dd>{attempt.reason || "—"}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <AddAdminButton
                    attempt={attempt}
                    alreadyAdmin={adminSet.has(attempt.email)}
                    action={addAction}
                    pending={addPending}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage === pageCount}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ResultBadge({ result }: { result: LoginResult }) {
  const className =
    LOGIN_RESULT_BADGE[result] ??
    "bg-slate-100 text-slate-700 ring-slate-500/20";
  const label =
    result === "ALLOWED_ADMIN"
      ? "Admin"
      : result === "ALLOWED_USER"
        ? "User"
        : (result ?? "—");

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {label}
    </span>
  );
}

function AddAdminButton({
  attempt,
  alreadyAdmin,
  action,
  pending,
}: {
  attempt: LoginAttempt;
  alreadyAdmin: boolean;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  // Only a denied attempt is worth acting on, and only for a real address.
  if (attempt.result !== "DENIED" || !attempt.email) return null;

  if (alreadyAdmin) {
    return <span className="text-xs text-slate-500">Already an admin</span>;
  }

  return (
    <form action={action}>
      <input type="hidden" name="email" value={attempt.email} />
      <input type="hidden" name="name" value={attempt.name} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Add as admin
      </button>
    </form>
  );
}
