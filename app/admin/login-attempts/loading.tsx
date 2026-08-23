import {
  SkeletonFilters,
  SkeletonRegion,
  SkeletonTable,
} from "@/components/Skeleton";

export default function LoginAttemptsLoading() {
  return (
    <SkeletonRegion label="Loading sign-in attempts">
      <div className="mb-5 space-y-2">
        <div className="h-7 w-52 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-8 w-12 animate-pulse rounded bg-slate-200" />
      </div>
      <SkeletonFilters count={4} />
      <div className="mt-5">
        <SkeletonTable rows={8} columns={6} />
      </div>
    </SkeletonRegion>
  );
}
