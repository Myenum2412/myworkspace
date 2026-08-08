"use client";
import { useEffect, useState } from "react";

export interface IpLocation {
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}

export function useIpLocation() {
  const [location, setLocation] = useState<IpLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("http://ip-api.com/json/")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          if (data.status === "success") {
            setLocation(data);
          } else {
            setError(data.message || "Failed to detect location");
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not detect location");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { location, loading, error };
}
