import { signOut } from "@/lib/auth";

export const metadata = { title: "Account not registered" };

/**
 * Shown when the signIn callback resolved a role of "denied".
 *
 * Deliberately says nothing about whether the email exists anywhere in the
 * data. "Not registered" is the only fact disclosed; anything more would let a
 * stranger probe the spreadsheet one sign-in at a time.
 */
export default function AccessDeniedPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          This account is not registered
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          The Google account you signed in with is not linked to any record in
          this system. That usually just means the office has not added it yet.
        </p>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Contact the office and ask them to register this email address. If you
          have more than one Google account, you may have signed in with the
          wrong one.
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Try a different account
          </button>
        </form>
      </div>
    </main>
  );
}
