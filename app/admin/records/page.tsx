import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { load } from "@/lib/safe";
import { listRecords } from "@/lib/sheets/records";
import { DataUnavailable } from "@/components/DataUnavailable";
import { RecordsTable } from "@/components/RecordsTable";
import { SavedBanner } from "@/components/SavedBanner";
import { SkeletonFilters, SkeletonRegion, SkeletonTable } from "@/components/Skeleton";

export const metadata = { title: "Records" };

/**
 * The skeleton lives in a Suspense boundary inside this page rather than in a
 * loading.tsx beside it, and that is deliberate.
 *
 * A loading.tsx here would also cover /admin/records/[id]/edit, turning that
 * route into a streaming one. Its HTTP status would then be flushed before the
 * page discovered the record was missing, so a mistyped UUID returned 200 while
 * displaying "Record not found" — measured, not guessed. Scoping the boundary
 * to this page keeps the skeleton here and a real 404 there.
 */
async function RecordsSection() {
  const result = await load(() => listRecords());

  if (!result.ok) {
    return <DataUnavailable message={result.message} kind={result.kind} />;
  }
  return <RecordsTable records={result.data} />;
}

export default async function AdminRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { saved } = await searchParams;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Records
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every cooperative in the register. Changes are written straight to
            the spreadsheet.
          </p>
        </div>
        <Link
          href="/admin/records/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          New record
        </Link>
      </div>

      <SavedBanner saved={saved} />

      <Suspense
        fallback={
          <SkeletonRegion label="Loading records">
            <SkeletonFilters count={2} />
            <div className="mt-5">
              <SkeletonTable rows={8} columns={6} />
            </div>
          </SkeletonRegion>
        }
      >
        <RecordsSection />
      </Suspense>
    </div>
  );
}
