export default function GoalsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton-title" />
          <div className="skeleton-text w-40" />
        </div>
        <div className="skeleton h-10 w-36 rounded-xl" />
      </div>
      <div className="flex gap-3">
        <div className="skeleton h-10 w-20 rounded-xl" />
        <div className="skeleton h-10 w-20 rounded-xl" />
        <div className="skeleton h-10 w-24 rounded-xl" />
        <div className="skeleton h-10 w-24 rounded-xl" />
        <div className="skeleton h-10 w-24 rounded-xl ml-auto" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
