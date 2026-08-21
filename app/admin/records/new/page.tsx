import { requireAdmin } from "@/lib/guards";
import { createRecordAction } from "@/lib/actions/records";
import { RecordForm } from "@/components/RecordForm";

export const metadata = { title: "New record" };

export default async function NewRecordPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        New record
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        The record identifier and audit columns are filled in automatically.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <RecordForm action={createRecordAction} submitLabel="Create record" />
      </div>
    </div>
  );
}
