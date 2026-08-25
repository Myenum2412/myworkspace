import { DottedMap } from "@/components/ui/dotted-map";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <DottedMap
          width={800}
          height={400}
          dotColor="hsl(var(--muted-foreground))"
          markerColor="#FF6900"
          markers={[
            { lat: 40.7128, lng: -74.006, size: 0.5 },
            { lat: 51.5074, lng: -0.1278, size: 0.5 },
            { lat: 35.6762, lng: 139.6503, size: 0.5 },
          ]}
          className="rounded-lg border"
        />
      </div>
      <h1 className="mt-8 text-3xl font-bold">About</h1>
      <p className="mt-4 text-muted-foreground">Coming soon.</p>
    </main>
  );
}
