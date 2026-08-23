"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-slate-50 px-4"
    >
      <ErrorPanel
        error={error}
        reset={reset}
        homeHref="/"
        homeLabel="Back to sign in"
      />
    </main>
  );
}
