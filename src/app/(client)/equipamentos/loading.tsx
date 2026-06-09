export default function EquipamentosLoading() {
  return (
    <div className="container py-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-gray-200 dark:bg-dark-3" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-stroke p-5 h-24 bg-gray-100 dark:bg-dark-2" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-stroke p-5 h-48 bg-gray-100 dark:bg-dark-2" />
        ))}
      </div>
    </div>
  )
}
