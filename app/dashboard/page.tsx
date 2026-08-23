import { requireUser } from "@/lib/guards";
import { load } from "@/lib/safe";
import { getRecordsByEmail } from "@/lib/sheets/records";
import { DashboardRecords } from "@/components/DashboardRecords";
import { DataUnavailable } from "@/components/DataUnavailable";
import { RecordCard } from "@/components/RecordCard";

/**
 * The user's own records, and nothing else.
 *
 * Scoping happens on the getRecordsByEmail line, and only the resulting rows
 * are ever serialised to the browser. The full table is never sent down for the
 * client to filter, so there is nothing for a curious user to find in the page
 * source or the network tab.
 */
export default async function DashboardPage() {
  const session = await requireUser();
  const result = await load(() => getRecordsByEmail(session.user.email));

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Your submission status
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Certificate of Compliance and report submission status held by the
          office.
        </p>
      </div>

      {!result.ok ? (
        <DataUnavailable
          message={result.message}
          kind={result.kind}
          title={
            result.kind === "rate_limited"
              ? undefined
              : "Your records are unavailable"
          }
        />
      ) : result.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-base font-medium text-slate-900">
            No records yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Your account is registered, but no cooperative record is linked to
            it yet. Please contact the office if you expected to see something
            here.
          </p>
        </div>
      ) : result.data.length === 1 ? (
        <RecordCard record={result.data[0]} />
      ) : (
        <DashboardRecords records={result.data} />
      )}
    </>
  );
}
