export default function GroupsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 w-36 bg-dark-700 rounded-lg" />
        <div className="h-10 w-40 bg-dark-700 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 bg-dark-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
