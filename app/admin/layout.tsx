import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { requireAdmin } from "@/lib/guards";
import { AdminNav } from "@/components/AdminNav";

/**
 * A plain string `title` here would replace the title config for this whole
 * subtree, and because it carries no template, every nested admin page would
 * lose the app name from its tab ("Records" instead of "Records — COC &
 * Reports…"). Declaring the template explicitly keeps it.
 */
export const metadata = {
  title: {
    default: "Administration",
    template: "%s — COC & Reports Submission Status",
  },
};

/**
 * Admin shell.
 *
 * The nav lists only routes that exist. Links to Import, Login attempts and
 * Admins arrive with Phases 7, 8 and 9 — a nav full of 404s teaches people to
 * distrust the navigation.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireAdmin();
  const name = session.user.name?.trim() || session.user.email;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <Link
                href="/admin"
                className="text-sm font-semibold text-slate-900"
              >
                COC &amp; Reports Administration
              </Link>
              <p className="truncate text-xs text-slate-500">{name}</p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                My records
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <AdminNav />
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
      >
        {children}
      </main>
    </div>
  );
}
