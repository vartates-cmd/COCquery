import Link from "next/link";

export const metadata = { title: "Sign-in problem" };

/**
 * Generic auth failure page.
 *
 * The reassuring "this is usually temporary" wording is right for a real user,
 * but on its own it hides the one fact needed to fix a misconfiguration. So the
 * Auth.js error code is always shown in small print, and in development the
 * page also explains what that code usually means.
 *
 * The codes are Auth.js's own generic identifiers — they describe the stage
 * that failed, never anything about the account — so showing them leaks nothing.
 */

const CODE_HELP: Record<string, string> = {
  AccessDenied:
    "Google refused the account. The usual causes: the OAuth consent screen is still in Testing mode and this address is not on the test-user list, or the OAuth client is set to Internal, which only admits accounts inside your Workspace organisation and rejects personal @gmail.com addresses.",
  Configuration:
    "The server rejected its own settings. Check AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are present and belong to the same Google Cloud project.",
  Verification: "The sign-in link expired or had already been used.",
  OAuthSignin: "The app could not start the handshake with Google.",
  OAuthCallback:
    "Google rejected the callback. Most often the redirect URI is not registered on the OAuth client — it must match exactly, including http vs https, port, and trailing path.",
  OAuthAccountNotLinked:
    "This email is already associated with a different sign-in method.",
  Callback: "The app failed while handling Google's response.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; error?: string }>;
}) {
  const { reason, error } = await searchParams;
  const isLookupFailure = reason === "lookup_failed";
  const code = error?.trim();
  const help = code ? CODE_HELP[code] : undefined;
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {isLookupFailure
            ? "We could not check your access"
            : "Sign-in did not complete"}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {isLookupFailure
            ? "The system could not reach its records just now, so it could not confirm whether your account has access. This is a problem on our side, not with your account."
            : "Something interrupted the sign-in before it finished. This is usually temporary."}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Please try again in a moment. If it keeps happening, contact the
          office.
        </p>

        {code ? (
          <p className="mt-6 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
            Reference: {code}
          </p>
        ) : null}

        {isDev && help ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">
              Development note (hidden in production)
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              {help}
            </p>
          </div>
        ) : null}

        <Link
          href="/"
          className="mt-8 block w-full rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
