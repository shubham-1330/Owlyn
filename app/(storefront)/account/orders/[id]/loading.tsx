export default function OrderLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading order">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 animate-pulse bg-muted" />
        <div className="h-8 w-64 animate-pulse bg-muted" />
        <div className="h-4 w-48 animate-pulse bg-muted" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <div className="h-40 animate-pulse bg-muted" />
          <div className="h-56 animate-pulse bg-muted" />
        </div>
        <div className="h-72 animate-pulse bg-muted" />
      </div>
    </div>
  );
}
