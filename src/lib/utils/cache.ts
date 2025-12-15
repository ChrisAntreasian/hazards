/**
 * HTTP Caching utilities for API responses
 * Week 9 Performance Optimization
 */

export const CACHE_DURATIONS = {
  categories: "public, max-age=86400, stale-while-revalidate=604800",
  templates: "public, max-age=86400, stale-while-revalidate=604800",
  staticAssets: "public, max-age=31536000, immutable",
  hazardsList: "public, max-age=300, stale-while-revalidate=3600",
  hazardDetail: "public, max-age=60, stale-while-revalidate=300",
  mapHazards: "public, max-age=120, stale-while-revalidate=600",
  userProfile: "private, max-age=300",
  userHazards: "private, max-age=60",
  leaderboard: "public, max-age=60, stale-while-revalidate=300",
  moderation: "private, no-cache",
  hazardImages: "public, max-age=2592000, immutable",
  userAvatars: "public, max-age=86400, stale-while-revalidate=604800",
  noCache: "no-store, no-cache, must-revalidate",
} as const;

export type CacheType = keyof typeof CACHE_DURATIONS;

export function setCacheHeaders(
  setHeaders: (headers: Record<string, string>) => void,
  cacheType: CacheType
): void {
  setHeaders({ "Cache-Control": CACHE_DURATIONS[cacheType] });
}

export function generateETag(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

export function checkETagMatch(request: Request, etag: string): boolean {
  const ifNoneMatch = request.headers.get("If-None-Match");
  return ifNoneMatch === etag;
}

export function cachedJsonResponse<T>(
  data: T,
  cacheType: CacheType,
  request?: Request
): Response {
  const etag = generateETag(data);
  if (request && checkETagMatch(request, etag)) {
    return new Response(null, { 
      status: 304,
      headers: { "ETag": etag, "Cache-Control": CACHE_DURATIONS[cacheType] }
    });
  }
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_DURATIONS[cacheType],
      "ETag": etag
    }
  });
}