"use client";

import { ErrorPanel } from "@/components/ErrorPanel";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorPanel
      title="We could not load your records"
      description="Your records could not be fetched just now. This is a problem on our side, not with your account. Please try again in a moment."
      error={error}
      reset={reset}
    />
  );
}
