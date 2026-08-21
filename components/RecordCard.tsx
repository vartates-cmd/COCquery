import { STATUS_REQUIRING_REASON } from "@/lib/constants";
import type { CocRecord } from "@/lib/sheets/records";
import { StatusBadge } from "@/components/StatusBadge";

/**
 * One cooperative's record, as the cooperative itself sees it.
 *
 * Receives data as props and never reaches for it — nothing under /components
 * may touch the Sheets layer, so the security boundary stays visible in the
 * file tree.
 */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value.trim() || "—"}</dd>
    </div>
  );
}

/** Turn 2026-08-21 into 21 August 2026, leaving anything unparseable alone. */
function formatDate(iso: string): string {
  const value = iso.trim();
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function RecordCard({ record }: { record: CocRecord }) {
  const isDeferred = record.cocStatus.trim().toLowerCase() === STATUS_REQUIRING_REASON.toLowerCase();
  const reason = record.reasonForDeferment.trim();
  const updated = formatDate(record.dateUpdated);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
            {record.cooperativeName.trim() || "Unnamed cooperative"}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            {record.registrationNumber.trim() || "No registration number"}
          </p>
        </div>
        <StatusBadge status={record.cocStatus} />
      </header>

      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="COC Status" value={record.cocStatus} />
        <Field label="Report Submission" value={record.reportSubmissionStatus} />
      </dl>

      {isDeferred ? (
        <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
          <h3 className="text-sm font-semibold text-purple-900">Reason for deferment</h3>
          <p className="mt-1 text-sm leading-relaxed text-purple-900">
            {reason ||
              "No reason has been recorded yet. Please contact the office for details on what is needed."}
          </p>
        </div>
      ) : null}

      {updated ? (
        <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
          Last updated {updated}
        </p>
      ) : null}
    </article>
  );
}
