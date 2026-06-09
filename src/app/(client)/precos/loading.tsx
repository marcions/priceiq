export default function Loading() {
  return (
    <div className="space-y-6 p-2 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-gray-2 dark:bg-dark-3" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-2 dark:bg-dark-3" />
        ))}
      </div>
      <div className="h-10 w-full rounded-lg bg-gray-2 dark:bg-dark-3" />
      <div className="h-64 rounded-xl bg-gray-2 dark:bg-dark-3" />
    </div>
  )
}
