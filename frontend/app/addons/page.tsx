"use client";

import { useState, useEffect } from "react";

const PuzzleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
  </svg>
);

type NetworkStatus = "checking" | "online" | "offline";

export default function AddonsPage() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>("checking");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    checkNetwork();
  }, []);

  async function checkNetwork() {
    setNetworkStatus("checking");
    setLatency(null);

    try {
      const start = performance.now();
      const res = await fetch("/api/health", { method: "HEAD", cache: "no-store" });
      const end = performance.now();

      if (res.ok) {
        setNetworkStatus("online");
        setLatency(Math.round(end - start));
      } else {
        setNetworkStatus("offline");
      }
    } catch {
      setNetworkStatus("offline");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-3">
        <PuzzleIcon className="size-7 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold">Addons</h1>
      </div>

      {/* Network Status Card */}
      <div className="rounded-lg border bg-card p-5 max-w-md">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Network Status</h2>
        <div className="flex items-center gap-3 mb-4">
          <span className={`size-3 rounded-full ${
            networkStatus === "online" ? "bg-green-500" :
            networkStatus === "offline" ? "bg-red-500" :
            "bg-yellow-500 animate-pulse"
          }`} />
          <span className="text-sm font-medium capitalize">
            {networkStatus === "checking" ? "Checking..." : networkStatus}
          </span>
          {latency !== null && (
            <span className="text-xs text-muted-foreground ml-auto">{latency}ms</span>
          )}
        </div>
        <button
          onClick={checkNetwork}
          disabled={networkStatus === "checking"}
          className="text-sm px-3 py-1.5 rounded-md border bg-background hover:bg-accent transition-colors disabled:opacity-50"
        >
          {networkStatus === "checking" ? "Checking..." : "Recheck"}
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <PuzzleIcon className="size-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">No addons installed yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Addons will appear here once available.</p>
      </div>
    </main>
  );
}
