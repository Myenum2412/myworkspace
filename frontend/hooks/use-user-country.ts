import { useState, useEffect } from "react";

export function useUserCountry() {
  const [country, setCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem("user_country");
    if (cached) {
      setCountry(cached);
      setLoading(false);
      return;
    }

    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        const c = data?.country || null;
        setCountry(c);
        if (c) sessionStorage.setItem("user_country", c);
      })
      .catch(() => {
        setCountry(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { country, loading };
}

export function getCurrencySymbol(country: string | null): string {
  if (!country) return "$";
  const upper = country.toUpperCase();
  if (upper === "IN" || upper === "INDIA") return "₹";
  return "$";
}

export function isINR(country: string | null): boolean {
  if (!country) return false;
  const upper = country.toUpperCase();
  return upper === "IN" || upper === "INDIA";
}
