"use client";

import Link from "next/link";

/**
 * Shared body for the error.tsx boundaries.
 *
 * A note on what can be shown here: in production Next.js replaces the message
 * of a server-side error with a generic one before it reaches the browser, so
 * only the `digest` survives. That is deliberate — messages can leak internals.
 *
 * It also means this boundary cannot show "the system is busy, try again in a
 * moment". Those explanations come from the data layer's SheetsError and are
 * rendered by the pages themselves via lib/safe.ts. This boundary is the net
 * for everything nobody predicted, so it apologises, offers a retry, and
 * surfaces the digest for whoever ends up reading the server logs.
 */
export function ErrorPanel({
  title = "Something went wrong",
  description = "The page could not be displayed. This is usually temporary.",
  error,
  reset,
  homeHref,
  homeLabel,
}: {
  title?: string;
  description?: string;
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
}) {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {description}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Try again
          </button>
          {homeHref ? (
            <Link
              href={homeHref}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {homeLabel ?? "Go back"}
            </Link>
          ) : null}
        </div>

        {error.digest ? (
          <p className="mt-6 font-mono text-xs text-slate-400">
            Reference: {error.digest}
          </p>
        ) : null}

        {isDev ? (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs whitespace-pre-wrap text-slate-700">
            {error.message}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
