export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="skeleton h-6 w-32 rounded-full" />
          <div className="skeleton-title" />
          <div className="skeleton-text w-48" />
        </div>
        <div className="skeleton h-12 w-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-stat" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
