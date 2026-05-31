import { describe, expect, it } from "vitest";
import {
  normalizeRouteBase,
  routePath,
  stripRouteBase,
} from "../components/fet/app-shell/lib/routing.js";

describe("tenant route helpers", () => {
  it("normalizes route bases", () => {
    expect(normalizeRouteBase("")).toBe("");
    expect(normalizeRouteBase("/")).toBe("");
    expect(normalizeRouteBase("demo")).toBe("/demo");
    expect(normalizeRouteBase("/demo/")).toBe("/demo");
  });

  it("prefixes app paths with a tenant route base", () => {
    expect(routePath("/demo", "/dang-nhap")).toBe("/demo/dang-nhap");
    expect(routePath("/demo", "tong-quan")).toBe("/demo/tong-quan");
    expect(routePath("/demo", "/")).toBe("/demo");
    expect(routePath("", "/tong-quan")).toBe("/tong-quan");
  });

  it("strips tenant route base before resolving a page id", () => {
    expect(stripRouteBase("/demo", "/demo")).toBe("/");
    expect(stripRouteBase("/demo/xuat-hang", "/demo")).toBe("/xuat-hang");
    expect(stripRouteBase("/xuat-hang", "")).toBe("/xuat-hang");
  });
});
