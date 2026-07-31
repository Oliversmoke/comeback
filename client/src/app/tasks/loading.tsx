export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton-title" />
          <div className="skeleton-text w-40" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>
      <div className="flex gap-3">
        <div className="skeleton h-10 w-20 rounded-xl" />
        <div className="skeleton h-10 w-24 rounded-xl" />
        <div className="skeleton h-10 w-28 rounded-xl" />
        <div className="skeleton h-10 w-20 rounded-xl ml-auto" />
      </div>
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
