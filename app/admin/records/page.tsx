import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { listRecords } from "@/lib/sheets/records";
import { RecordsTable } from "@/components/RecordsTable";
import { SavedBanner } from "@/components/SavedBanner";

export const metadata = { title: "Records" };

export default async function AdminRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();

  const [{ saved }, records] = await Promise.all([searchParams, listRecords()]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Records
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every cooperative in the register. Changes are written straight to the spreadsheet.
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

      <RecordsTable records={records} />
    </div>
  );
}
