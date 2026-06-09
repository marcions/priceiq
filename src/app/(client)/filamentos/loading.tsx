export default function Loading() {
  return (
    <div className="container py-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-gray-200 dark:bg-dark-3 rounded-lg" />
        <div className="h-9 w-36 bg-gray-200 dark:bg-dark-3 rounded-lg" />
      </div>
      <div className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark overflow-hidden">
        <div className="border-b border-stroke dark:border-dark-3 bg-gray-1 dark:bg-dark-2 px-4 py-3 flex gap-4">
          {[150, 150, 80, 80, 100].map((w, i) => (
            <div key={i} className="h-4 bg-gray-300 dark:bg-dark-3 rounded" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b border-stroke dark:border-dark-3 px-4 py-3 flex gap-4 items-center">
            {[150, 150, 80, 80, 100].map((w, j) => (
              <div key={j} className="h-4 bg-gray-200 dark:bg-dark-3 rounded" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
