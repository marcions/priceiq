export default function Loading() {
  return (
    <div className="space-y-6 p-2 animate-pulse">
      <div>
        <div className="h-8 w-40 bg-gray-200 dark:bg-dark-3 rounded-lg" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-dark-3 rounded mt-2" />
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stroke bg-white p-5 dark:border-dark-3 dark:bg-gray-dark">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-gray-200 dark:bg-dark-3 rounded" />
              <div className="h-5 w-5 bg-gray-200 dark:bg-dark-3 rounded" />
            </div>
            <div className="mt-3 h-9 w-16 bg-gray-200 dark:bg-dark-3 rounded" />
            <div className="mt-1 h-3 w-28 bg-gray-200 dark:bg-dark-3 rounded" />
          </div>
        ))}
      </div>
      {/* Table placeholder */}
      <div className="rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark h-64" />
    </div>
  )
}
