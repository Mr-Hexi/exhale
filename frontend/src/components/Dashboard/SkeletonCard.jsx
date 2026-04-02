export default function SkeletonCard({ height = "h-48" }) {
  return (
    <div className={`${height} ui-card animate-pulse`}>
      <div className="mb-4 h-4 w-1/3 rounded bg-[rgba(23,33,43,0.08)]" />
      <div className="space-y-3">
        <div className="h-3 w-full rounded bg-[rgba(23,33,43,0.05)]" />
        <div className="h-3 w-5/6 rounded bg-[rgba(23,33,43,0.05)]" />
        <div className="h-3 w-4/6 rounded bg-[rgba(23,33,43,0.05)]" />
      </div>
    </div>
  );
}
