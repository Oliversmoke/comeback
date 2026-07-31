export default function AICoachLoading() {
  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton-avatar" />
          <div className="space-y-2">
            <div className="skeleton-title" />
            <div className="skeleton-text w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-10 w-24 rounded-xl" />
          <div className="skeleton h-10 w-36 rounded-xl" />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 skeleton rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
