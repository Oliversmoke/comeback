export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="skeleton-avatar" />
        <div className="space-y-2">
          <div className="skeleton-title" />
          <div className="skeleton-text w-48" />
        </div>
      </div>
      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="lg:w-56 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
        <div className="flex-1 skeleton h-96 rounded-2xl" />
      </div>
    </div>
  );
}
