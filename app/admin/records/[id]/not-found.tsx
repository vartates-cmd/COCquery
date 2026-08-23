import Link from "next/link";

export const metadata = { title: "Record not found" };

/**
 * Reached when getRecordById returns nothing — a mistyped UUID, or a record
 * deleted between the table rendering and the edit page opening. Neither is an
 * error worth alarming anyone about.
 */
export default function RecordNotFound() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Record not found
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          No record with that identifier exists. It may have been deleted, or
          the link may be out of date.
        </p>
        <Link
          href="/admin/records"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Back to records
        </Link>
      </div>
    </div>
  );
}
