export default function GroupsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton-title" />
          <div className="skeleton-text w-36" />
        </div>
        <div className="skeleton h-10 w-36 rounded-xl" />
      </div>
      <div className="flex gap-3">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-10 w-40 rounded-xl" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
