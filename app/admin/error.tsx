"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPanel
      title="This page could not be loaded"
      description="Something failed while loading the administration area. If it keeps happening, check the server logs for the reference below."
      error={error}
      reset={reset}
      homeHref="/admin"
      homeLabel="Back to overview"
    />
  );
}
