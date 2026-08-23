import { requireAdmin } from "@/lib/guards";
import { bootstrapAdminEmails, normalizeEmail } from "@/lib/roles";
import { load } from "@/lib/safe";
import { listAdmins } from "@/lib/sheets/admins";
import { DataUnavailable } from "@/components/DataUnavailable";
import { AdminsManager } from "@/components/AdminsManager";

export const metadata = { title: "Administrators" };

export default async function AdminsPage() {
  const session = await requireAdmin();
  const result = await load(() => listAdmins());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Administrators
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Who can administer the system. Access for a cooperative is granted
          separately, by putting their email on a record.
        </p>
      </div>

      {result.ok ? (
        <AdminsManager
          admins={result.data}
          bootstrapAdmins={bootstrapAdminEmails()}
          currentEmail={normalizeEmail(session.user.email)}
        />
      ) : (
        <DataUnavailable
          message={result.message}
          kind={result.kind}
          title="Administrators are unavailable"
        />
      )}
    </div>
  );
}
