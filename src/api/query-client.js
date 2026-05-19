const DEFAULT_STALE_TIME = 30_000;

const queryCache = new Map();

function queryKeyId(queryKey) {
  return JSON.stringify(Array.isArray(queryKey) ? queryKey : [queryKey]);
}

export async function useQuery({
  force = false,
  queryFn,
  queryKey,
  staleTime = DEFAULT_STALE_TIME,
}) {
  const key = queryKeyId(queryKey);
  const cached = queryCache.get(key);
  const now = Date.now();

  if (!force && cached) {
    if (cached.promise) return cached.promise;
    if (now - cached.updatedAt < staleTime) return cached.data;
  }

  const promise = Promise.resolve()
    .then(queryFn)
    .then((data) => {
      queryCache.set(key, { data, updatedAt: Date.now() });
      return data;
    })
    .catch((error) => {
      if (cached) {
        queryCache.set(key, cached);
      } else {
        queryCache.delete(key);
      }
      throw error;
    });

  queryCache.set(key, {
    data: cached?.data,
    promise,
    updatedAt: cached?.updatedAt || 0,
  });

  return promise;
}

export function invalidateQueries(queryKeyPrefix) {
  const prefix = queryKeyId(queryKeyPrefix).slice(0, -1);
  queryCache.forEach((_value, key) => {
    if (key.startsWith(prefix)) {
      queryCache.delete(key);
    }
  });
}

export function clearQueryCache() {
  queryCache.clear();
}
