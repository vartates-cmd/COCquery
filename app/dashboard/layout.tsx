import type { ReactNode } from "react";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/guards";

// The root layout appends the app name via a title template.
export const metadata = { title: "Your records" };

/**
 * User area shell.
 *
 * requireUser() runs here and again inside the page. That is deliberate
 * belt-and-braces: a layout guard alone does not protect server actions or
 * route handlers nested beneath it, and Next does not guarantee a layout
 * re-runs for every nested render.
 *
 * There are no links to admin routes here — not hidden by role, simply never
 * rendered. An admin reaching this page navigates by URL.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const name = session.user.name?.trim() || session.user.email;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {session.user.image ? (
              // Plain <img>: the avatar is a small remote Google URL and using
              // next/image here would mean configuring a remote host pattern
              // for no measurable benefit.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-full bg-slate-200"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{name}</p>
              <p className="truncate text-xs text-slate-500">{session.user.email}</p>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
