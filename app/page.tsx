import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { homePathForRole } from "@/lib/roles";

export const metadata = {
  // absolute: the landing page is the app name itself, so it must not get the
  // "%s — COC & Reports Submission Status" template appended to it.
  title: { absolute: "COC & Reports Submission Status" },
  description: "Check the status of your Certificate of Compliance and report submissions.",
};

export default async function LandingPage() {
  const session = await auth();
  if (session?.user?.role) redirect(homePathForRole(session.user.role));

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          COC &amp; Reports Submission Status
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Sign in with the Google account registered with the office to view the status of
          your Certificate of Compliance and report submissions.
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <GoogleMark />
            Sign in with Google
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          Access is granted by the office. If your account is not recognised, contact the
          office to have it registered.
        </p>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
