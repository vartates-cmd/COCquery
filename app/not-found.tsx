import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          That address does not exist. It may have been mistyped, or the page
          may have moved.
        </p>
        <Link
          href="/"
          className="mt-8 block w-full rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Go to the start
        </Link>
      </div>
    </main>
  );
}
