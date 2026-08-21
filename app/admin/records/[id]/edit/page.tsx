import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/guards";
import { updateRecordAction } from "@/lib/actions/records";
import { getRecordById } from "@/lib/sheets/records";
import { RecordForm } from "@/components/RecordForm";

export const metadata = { title: "Edit record" };

export default async function EditRecordPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;
  const record = await getRecordById(id);

  // A record can vanish between the table rendering and this page loading, and
  // a UUID can be typed wrong. Either way this is a 404, not an error.
  if (!record) notFound();

  // Binding the id server-side means the browser never gets to choose which
  // record an update targets.
  const action = updateRecordAction.bind(null, record.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        Edit record
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Last updated {record.dateUpdated || "—"}
        {record.updatedBy ? ` by ${record.updatedBy}` : ""}.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <RecordForm action={action} record={record} submitLabel="Save changes" />
      </div>
    </div>
  );
}
