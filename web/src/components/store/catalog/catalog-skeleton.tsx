/** Esqueleto del catálogo mientras se cargan los resultados (misma geometría que las tarjetas reales). */
export function CatalogSkeleton() {
  const pulse = "bg-tile animate-pulse motion-reduce:animate-none";
  return (
    <div className="mx-auto max-w-shop px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10" aria-busy="true">
      <span className="sr-only" role="status">
        Loading products…
      </span>
      <div className={`${pulse} h-10 w-56 rounded-lg`} />
      <div className={`${pulse} mt-3 h-5 w-28 rounded-md`} />
      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <li key={i}>
            <div className={`${pulse} aspect-square rounded-xl`} />
            <div className={`${pulse} mt-3 h-5 w-16 rounded`} />
            <div className={`${pulse} mt-2 h-4 w-4/5 rounded`} />
            <div className={`${pulse} mt-2 h-4 w-1/2 rounded`} />
          </li>
        ))}
      </ul>
    </div>
  );
}
