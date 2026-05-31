export function normalizeRouteBase(value = "") {
  const base = value.toString().trim();
  if (!base || base === "/") return "";
  return `/${base.replace(/^\/+|\/+$/g, "")}`;
}

export function routePath(routeBase = "", path = "/") {
  const base = normalizeRouteBase(routeBase);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalizedPath;
  if (normalizedPath === "/") return base;
  return `${base}${normalizedPath}`;
}

export function stripRouteBase(pathname = "/", routeBase = "") {
  const base = normalizeRouteBase(routeBase);
  if (!base) return pathname || "/";
  if (pathname === base) return "/";
  if (pathname.startsWith(`${base}/`)) {
    return pathname.slice(base.length) || "/";
  }
  return pathname || "/";
}
