export default function ChatLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton-title" />
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        <div className="w-72 flex-shrink-0 hidden md:block">
          <div className="skeleton h-full rounded-2xl" />
        </div>
        <div className="flex-1">
          <div className="skeleton h-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
