const readCache = new Map();

const cacheTtl = {
  app: 10_000,
  master: 5 * 60_000,
  operations: 15_000,
  receipt: 15_000,
  dispatch: 15_000,
  report: 30_000,
};

const cacheGroups = {
  master: ["app", "master"],
  operations: ["app", "operations", "receipt", "dispatch", "inventory:"],
  report: ["app", "report", "billing-ready", "invoice-approvals"],
};

function cachedRead(key, loader, ttlMs = 15_000) {
  const now = Date.now();
  const cached = readCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = Promise.resolve()
    .then(loader)
    .catch((error) => {
      readCache.delete(key);
      throw error;
    });
  readCache.set(key, { expiresAt: now + ttlMs, promise });
  return promise;
}

function invalidateReadCache(...patterns) {
  if (!patterns.length) {
    readCache.clear();
    return;
  }

  for (const key of readCache.keys()) {
    if (patterns.some((pattern) => key === pattern || key.startsWith(pattern))) {
      readCache.delete(key);
    }
  }
}

function invalidateCacheGroups(...groups) {
  invalidateReadCache(...groups.flatMap((group) => cacheGroups[group] || []));
}

async function writeThrough(work, groups = []) {
  const result = await work();
  invalidateCacheGroups(...groups);
  return result;
}

module.exports = {
  cachedRead,
  cacheTtl,
  invalidateCacheGroups,
  invalidateReadCache,
  writeThrough,
};
