export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-pulse">
      <div className="w-80 bg-dark-700 rounded-xl hidden lg:block" />
      <div className="flex-1 bg-dark-700 rounded-xl" />
    </div>
  );
}
