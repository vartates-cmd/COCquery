import { Suspense } from "react";
import Link from "next/link";
import { COC_STATUSES } from "@/lib/constants";
import { requireAdmin } from "@/lib/guards";
import { load } from "@/lib/safe";
import { listRecords } from "@/lib/sheets/records";
import { listLoginAttempts } from "@/lib/sheets/attempts";
import { DataUnavailable } from "@/components/DataUnavailable";
import { SkeletonRegion, SkeletonStats, SkeletonTable } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "Overview" };

/**
 * Suspense lives inside the page rather than in a loading.tsx beside it. See
 * the note in app/admin/records/page.tsx: a loading.tsx anywhere above
 * /admin/records/[id]/edit makes that route stream, which flushes a 200 before
 * it can discover the record is missing.
 */
async function OverviewContent() {
  const [recordsResult, attemptsResult] = await Promise.all([
    load(() => listRecords()),
    load(() => listLoginAttempts()),
  ]);

  // Checked one at a time rather than combined: TypeScript narrows a union
  // through a direct `if (!x.ok)` and cannot follow a merged failure variable.
  if (!recordsResult.ok) {
    return <DataUnavailable message={recordsResult.message} kind={recordsResult.kind} />;
  }
  if (!attemptsResult.ok) {
    return <DataUnavailable message={attemptsResult.message} kind={attemptsResult.kind} />;
  }

  const records = recordsResult.data;
  const attempts = attemptsResult.data;

  const counts = new Map<string, number>();
  for (const record of records) {
    const key = record.cocStatus.trim() || "Not set";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Canonical statuses first, then anything unexpected the spreadsheet happens
  // to contain, so a typo is visible rather than lost.
  const knownKeys = new Set<string>(COC_STATUSES);
  const extraKeys = [...counts.keys()].filter((key) => !knownKeys.has(key)).sort();

  // Reading the clock is fine in a Server Component: it renders once per request.
  // eslint-disable-next-line react-hooks/purity
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const deniedLastWeek = attempts.filter((attempt) => {
    if (attempt.result !== "DENIED") return false;
    const time = new Date(attempt.timestamp).getTime();
    return Number.isFinite(time) && time >= cutoff;
  }).length;

  const recent = [...records]
    .sort((a, b) => b.dateUpdated.localeCompare(a.dateUpdated))
    .slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Total records
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{records.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Denied sign-ins
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{deniedLastWeek}</p>
          <p className="mt-0.5 text-xs text-slate-500">last 7 days</p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">By COC status</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...COC_STATUSES, ...extraKeys].map((status) => (
            <div key={status} className="rounded-xl border border-slate-200 bg-white p-4">
              <StatusBadge status={status} />
              <p className="mt-2 text-xl font-semibold text-slate-900">{counts.get(status) ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recently updated</h2>
          <Link
            href="/admin/records"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            View all records
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
            No records yet.{" "}
            <Link href="/admin/records/new" className="font-medium text-slate-900 underline">
              Add the first one
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {recent.map((record) => (
              <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link
                    href={`/admin/records/${record.id}/edit`}
                    className="truncate text-sm font-medium text-slate-900 hover:underline"
                  >
                    {record.cooperativeName || "Unnamed cooperative"}
                  </Link>
                  <p className="truncate font-mono text-xs text-slate-500">
                    {record.registrationNumber || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={record.cocStatus} />
                  <span className="text-xs text-slate-500">{record.dateUpdated || "—"}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Overview
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          A snapshot of the register and recent sign-in activity.
        </p>
      </div>

      <Suspense
        fallback={
          <SkeletonRegion label="Loading overview">
            <SkeletonStats count={2} />
            <div className="mt-8">
              <SkeletonTable rows={5} columns={3} />
            </div>
          </SkeletonRegion>
        }
      >
        <OverviewContent />
      </Suspense>
    </div>
  );
}
