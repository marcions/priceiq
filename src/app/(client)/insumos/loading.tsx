export default function InsumosLoading() {
  return (
    <div className="container py-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-gray-200 dark:bg-dark-3" />
      <div className="h-10 w-full max-w-sm rounded bg-gray-200 dark:bg-dark-3" />
      <div className="rounded-xl border border-stroke overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-stroke dark:border-dark-3">
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-dark-3" />
            <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-dark-3" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-dark-3" />
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-dark-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
