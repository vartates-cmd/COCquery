"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CocRecord } from "@/lib/sheets/records";
import { RecordCard } from "@/components/RecordCard";
import { StatusBadge } from "@/components/StatusBadge";

/**
 * Compact, expandable list for a user who has more than one record.
 *
 * The search box filters ONLY the records handed in as props, which the server
 * has already scoped to this user. There is no fetching here and no way to
 * widen the set — a client-side filter cannot reach data it was never given.
 */
export function DashboardRecords({ records }: { records: CocRecord[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchId = useId();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;

    return records.filter((record) =>
      [
        record.registrationNumber,
        record.cooperativeName,
        record.cocStatus,
        record.reportSubmissionStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, records]);

  return (
    <div>
      <div className="mb-4">
        <label
          htmlFor={searchId}
          className="block text-sm font-medium text-slate-700"
        >
          Search your records
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Registration number, name, or status"
          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-none"
        />
        <p className="mt-2 text-xs text-slate-500" aria-live="polite">
          Showing {filtered.length} of {records.length} records
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          No records match “{query.trim()}”.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((record) => {
            const isOpen = expanded === record.id;
            const panelId = `record-panel-${record.id}`;

            return (
              <li
                key={record.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : record.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-slate-900"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {record.cooperativeName.trim() || "Unnamed cooperative"}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-xs text-slate-500">
                      {record.registrationNumber.trim() ||
                        "No registration number"}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={record.cocStatus} />
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                {isOpen ? (
                  <div
                    id={panelId}
                    className="border-t border-slate-100 bg-slate-50/50 p-3"
                  >
                    <RecordCard record={record} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
