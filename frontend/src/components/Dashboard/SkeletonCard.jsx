export default function SkeletonCard({ height = "h-48" }) {
  return (
    <div className={`${height} bg-white rounded-2xl border border-gray-100 p-5 animate-pulse`}>
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
        <div className="h-3 bg-gray-100 rounded w-4/6" />
      </div>
    </div>
  );
}