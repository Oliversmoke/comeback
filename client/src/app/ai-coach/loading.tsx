export default function AICoachLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col animate-pulse">
      <div className="flex-1 space-y-4 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className={`h-16 bg-dark-700 rounded-2xl ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
          </div>
        ))}
      </div>
      <div className="h-16 bg-dark-700 rounded-xl" />
    </div>
  );
}
