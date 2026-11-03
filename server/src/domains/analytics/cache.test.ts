import { beforeEach, describe, expect, it, vi } from "vitest";

const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("../../config/redis.js", () => ({ redis: redisMock }));
vi.mock("../../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

async function loadCache() {
  // The cache module keeps the circuit-breaker state at module scope, so each
  // test needs a fresh instance.
  vi.resetModules();
  return import("./cache.js");
}

describe("dashboard cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockReset();
    redisMock.set.mockReset();
    redisMock.del.mockReset();
  });

  it("uses a versioned key and returns cached values", async () => {
    redisMock.get.mockResolvedValue({ totalBalance: 42 });
    const cache = await loadCache();

    const value = await cache.getCachedDashboard("user-1");

    expect(value).toEqual({ totalBalance: 42 });
    expect(redisMock.get).toHaveBeenCalledWith("dash:v1:user-1");
  });

  it("opens the circuit after three consecutive failures", async () => {
    redisMock.get.mockRejectedValue(new Error("redis down"));
    const cache = await loadCache();

    expect(await cache.getCachedDashboard("u")).toBeNull();
    expect(await cache.getCachedDashboard("u")).toBeNull();
    expect(await cache.getCachedDashboard("u")).toBeNull();
    expect(redisMock.get).toHaveBeenCalledTimes(3);

    // Circuit is open now: the fourth call never reaches Redis.
    expect(await cache.getCachedDashboard("u")).toBeNull();
    expect(redisMock.get).toHaveBeenCalledTimes(3);
  });

  it("deduplicates keys when invalidating", async () => {
    redisMock.del.mockResolvedValue(1);
    const cache = await loadCache();

    await cache.invalidateDashboardCache(["a", "a", "b"]);

    expect(redisMock.del).toHaveBeenCalledWith("dash:v1:a", "dash:v1:b");
  });

  it("does nothing when there are no users to invalidate", async () => {
    const cache = await loadCache();

    await cache.invalidateDashboardCache([]);

    expect(redisMock.del).not.toHaveBeenCalled();
  });
});
