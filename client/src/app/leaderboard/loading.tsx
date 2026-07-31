export default function LeaderboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton-title" />
        <div className="skeleton-text w-48" />
      </div>
      <div className="flex gap-3 mb-2">
        <div className="skeleton h-10 w-24 rounded-xl" />
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>
      <div className="skeleton h-24 rounded-2xl mb-6" />
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
