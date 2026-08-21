"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { COC_STATUSES } from "@/lib/constants";
import { deleteRecordAction, type DeleteState } from "@/lib/actions/records";
import type { CocRecord } from "@/lib/sheets/records";
import { StatusBadge } from "@/components/StatusBadge";

const PAGE_SIZE = 25;

/**
 * The admin record table: search, status filter, pagination, and row actions.
 *
 * Filtering happens in the browser over records the server already sent. That
 * is fine here — this page is admin-only, so there is no narrower scope to
 * enforce — but it does mean the whole table is in the page payload. If the
 * register grows into many thousands of rows this should move to server-side
 * pagination.
 */
export function RecordsTable({ records }: { records: CocRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<CocRecord | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return records.filter((record) => {
      if (status !== "all" && record.cocStatus.trim() !== status) return false;
      if (!needle) return true;
      return [record.registrationNumber, record.cooperativeName, record.accountEmail]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [records, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Clamped during render rather than corrected in an effect. A filter change
  // can leave `page` pointing past the end of a shorter result set; deriving
  // the value here avoids the extra render pass an effect would cause.
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="record-search" className="block text-sm font-medium text-slate-700">
            Search
          </label>
          <input
            id="record-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Registration number, cooperative name, or email"
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        <div className="sm:w-56">
          <label htmlFor="status-filter" className="block text-sm font-medium text-slate-700">
            COC status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
          >
            <option value="all">All statuses</option>
            {COC_STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500" aria-live="polite">
        {filtered.length} of {records.length} records
        {pageCount > 1 ? ` · page ${currentPage} of ${pageCount}` : ""}
      </p>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No records match those filters.
        </p>
      ) : (
        <>
          {/* Table for wide screens */}
          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-600 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Registration</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cooperative</th>
                  <th scope="col" className="px-4 py-3 font-medium">Account email</th>
                  <th scope="col" className="px-4 py-3 font-medium">COC status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Report</th>
                  <th scope="col" className="px-4 py-3 font-medium">Updated</th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{record.registrationNumber || "—"}</td>
                    <td className="px-4 py-3">{record.cooperativeName || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{record.accountEmail || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={record.cocStatus} /></td>
                    <td className="px-4 py-3 text-slate-600">{record.reportSubmissionStatus || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{record.dateUpdated || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/records/${record.id}/edit`}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(record)}
                          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards for phones */}
          <ul className="mt-4 space-y-3 md:hidden">
            {visible.map((record) => (
              <li key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {record.cooperativeName || "Unnamed cooperative"}
                    </p>
                    <p className="truncate font-mono text-xs text-slate-500">
                      {record.registrationNumber || "—"}
                    </p>
                  </div>
                  <StatusBadge status={record.cocStatus} />
                </div>

                <dl className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Email:</dt>
                    <dd className="truncate">{record.accountEmail || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Report:</dt>
                    <dd>{record.reportSubmissionStatus || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Updated:</dt>
                    <dd>{record.dateUpdated || "—"}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/records/${record.id}/edit`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(record)}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between">
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

      {pendingDelete ? (
        <DeleteDialog record={pendingDelete} onCancel={() => setPendingDelete(null)} />
      ) : null}
    </div>
  );
}

const DELETE_EMPTY: DeleteState = { ok: true };

function DeleteDialog({ record, onCancel }: { record: CocRecord; onCancel: () => void }) {
  const [state, formAction, isPending] = useActionState(deleteRecordAction, DELETE_EMPTY);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="delete-title" className="text-base font-semibold text-slate-900">
          Delete this record?
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          You are about to delete{" "}
          <strong className="font-medium text-slate-900">
            {record.cooperativeName || "this unnamed cooperative"}
          </strong>{" "}
          ({record.registrationNumber || "no registration number"}).
        </p>

        <p className="mt-2 text-sm leading-relaxed text-red-700">
          This is permanent. The row is removed from the spreadsheet and cannot be recovered from
          within this app.
        </p>

        {record.accountEmail ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            It will also remove access for {record.accountEmail}, unless another record is linked
            to that address.
          </p>
        ) : null}

        {state.message && !state.ok ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">
            {state.message}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <form action={formAction}>
            <input type="hidden" name="id" value={record.id} />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isPending ? "Deleting…" : "Delete permanently"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
