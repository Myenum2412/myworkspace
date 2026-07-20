export default function MarketplaceLoading() {
  return (
    <div className="container mx-auto p-6" aria-busy="true" aria-label="Loading integration marketplace">
      <div className="h-8 w-64 bg-muted rounded animate-pulse mb-6" />
      <div className="flex gap-2 mb-4">
        <div className="h-10 w-48 bg-muted rounded animate-pulse" />
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
