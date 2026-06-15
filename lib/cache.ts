import { cache } from "react";

export const getCachedData = cache(async <T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> => {
  return fetcher();
});

export function withCacheTag(tag: string) {
  return { next: { tags: [tag] } } as const;
}

export function withRevalidate(seconds: number) {
  return { next: { revalidate: seconds } } as const;
}
