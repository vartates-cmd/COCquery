import { requireAdmin } from "@/lib/guards";
import { ImportWizard } from "@/components/ImportWizard";

export const metadata = { title: "Import" };

export default async function ImportPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        Bulk import
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Add or update many records at once from a spreadsheet export. You will
        see exactly what will happen before anything is written.
      </p>

      <ImportWizard />
    </div>
  );
}
