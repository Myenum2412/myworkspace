"use client";

import { useState, useCallback, useRef } from "react";

interface PostOffice {
  Name: string;
  District: string;
  State: string;
  Country: string;
}

interface PincodeResult {
  cities: string[];
  states: string[];
  countries: string[];
  postOffices: PostOffice[];
}

export function usePincodeLookup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PincodeResult | null>(null);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const lookup = useCallback((pincode: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (pincode.length !== 6) {
      setResult(null);
      setError("");
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        if (!res.ok) throw new Error("API request failed");
        const data = await res.json();
        if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
          const postOffices: PostOffice[] = data[0].PostOffice;
          const states = [...new Set<string>(postOffices.map((p) => p.State))];
          const cities = [...new Set<string>(postOffices.map((p) => p.District))];
          const countries = [...new Set<string>(postOffices.map((p) => p.Country))];
          setResult({ states, cities, countries, postOffices });
        } else {
          setError("Invalid pincode");
          setResult(null);
        }
      } catch {
        setError("Failed to fetch location data");
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  return { loading, result, error, lookup };
}
