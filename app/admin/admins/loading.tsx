import { SkeletonRegion, SkeletonTable } from "@/components/Skeleton";

export default function AdminsLoading() {
  return (
    <SkeletonRegion label="Loading administrators">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      </div>
      <SkeletonTable rows={3} columns={2} />
    </SkeletonRegion>
  );
}
