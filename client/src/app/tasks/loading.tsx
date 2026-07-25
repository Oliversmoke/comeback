export default function TasksLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-28 bg-dark-700 rounded-lg" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-dark-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
