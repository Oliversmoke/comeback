export default function LeaderboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-dark-700 rounded-lg" />
      <div className="flex gap-2 mb-6">
        <div className="h-10 w-24 bg-dark-700 rounded-lg" />
        <div className="h-10 w-28 bg-dark-700 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-16 bg-dark-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
