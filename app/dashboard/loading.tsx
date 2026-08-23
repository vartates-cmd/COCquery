import { SkeletonCard, SkeletonRegion } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <SkeletonRegion label="Loading your records">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      </div>
      <SkeletonCard />
    </SkeletonRegion>
  );
}
