export default function DeveloperLoading() {
  return (
    <div className="container mx-auto p-6" aria-busy="true" aria-label="Loading developer portal">
      <div className="h-8 w-64 bg-muted rounded animate-pulse mb-6" />
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-28 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="h-48 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}
