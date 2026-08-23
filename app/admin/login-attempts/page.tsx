import { requireAdmin } from "@/lib/guards";
import { bootstrapAdminEmails } from "@/lib/roles";
import { load } from "@/lib/safe";
import { listAdmins } from "@/lib/sheets/admins";
import { listLoginAttempts } from "@/lib/sheets/attempts";
import type { SheetsErrorKind } from "@/lib/sheets/client";
import { DataUnavailable } from "@/components/DataUnavailable";
import { LoginAttemptsTable } from "@/components/LoginAttemptsTable";

export const metadata = { title: "Sign-in attempts" };

function LogFailure({
  message,
  kind,
}: {
  message: string;
  kind: SheetsErrorKind;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        Sign-in attempts
      </h1>
      <DataUnavailable
        message={message}
        kind={kind}
        title="The sign-in log is unavailable"
      />
    </div>
  );
}

export default async function LoginAttemptsPage() {
  await requireAdmin();

  const [attemptsResult, adminsResult] = await Promise.all([
    load(() => listLoginAttempts()),
    load(() => listAdmins()),
  ]);

  // Checked one at a time so TypeScript can narrow each union directly.
  if (!attemptsResult.ok) {
    return (
      <LogFailure message={attemptsResult.message} kind={attemptsResult.kind} />
    );
  }
  if (!adminsResult.ok) {
    return (
      <LogFailure message={adminsResult.message} kind={adminsResult.kind} />
    );
  }

  const attempts = attemptsResult.data;
  const admins = adminsResult.data;

  // Both sources, so the log does not offer to add someone who already has
  // access through the env var.
  const adminEmails = [
    ...admins.map((admin) => admin.email),
    ...bootstrapAdminEmails(),
  ];

  // Time-dependent values are resolved here, once, and handed down. See the
  // note on the component's `now` prop for why.
  //
  // The purity rule guards against reading the clock during a *client* render,
  // where server and hydration passes must agree. This is a Server Component:
  // it renders once per request, and "the last 24 hours" cannot be expressed
  // without asking what time it is.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const deniedLast24h = attempts.filter((attempt) => {
    if (attempt.result !== "DENIED") return false;
    const time = new Date(attempt.timestamp).getTime();
    return Number.isFinite(time) && time >= cutoff;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Sign-in attempts
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Every attempt to enter the system, allowed or denied, newest first.
        </p>
      </div>

      <LoginAttemptsTable
        attempts={attempts}
        adminEmails={adminEmails}
        deniedLast24h={deniedLast24h}
        now={now}
      />

      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
        <p>
          <strong className="font-medium text-slate-800">
            Granting access.
          </strong>{" "}
          Making someone an administrator gives them the whole system. To give a
          cooperative access to their own record instead, put their email in the{" "}
          <em>Account Email</em> column of that record — there is no separate
          sign-up.
        </p>
        <p>
          <strong className="font-medium text-slate-800">
            About IP addresses.
          </strong>{" "}
          On the live site this is the visitor&apos;s real address. When running
          on this machine it shows{" "}
          <code className="rounded bg-slate-100 px-1">::1</code> or{" "}
          <code className="rounded bg-slate-100 px-1">unknown</code>, which is
          normal and not a fault. Where a proxy reports a chain of addresses,
          the first one is recorded.
        </p>
        <p>
          <strong className="font-medium text-slate-800">
            This log grows forever.
          </strong>{" "}
          One row per sign-in attempt, never trimmed. That is fine for a few
          thousand rows; well beyond that, copy the older rows to a separate
          spreadsheet and delete them here.
        </p>
      </div>
    </div>
  );
}
