export default function SettingsLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
      <div className="h-8 w-32 bg-dark-700 rounded-lg" />
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 bg-dark-700 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
