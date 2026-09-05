import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installOn, isProtectedApiUrl } from "../src/interceptor.js";
import { navigation } from "../src/navigation.js";
import { setClient } from "../src/refresh.js";
import { isAuthenticated } from "../src/store.js";

const SESSION_BODY = {
  authenticated: true,
  username: "tester",
  role: "user",
  admin: false,
  expiresAt: new Date(Date.now() + 900000).toISOString(),
};

describe("interceptor", () => {
  let client;
  let mock;

  beforeEach(() => {
    client = axios.create();
    mock = new MockAdapter(client);
    installOn(client);
    setClient(client);
  });

  afterEach(() => {
    mock.restore();
    setClient(axios);
  });

  it("refreshes once and replays the original request", async () => {
    let attempts = 0;
    mock.onGet("/api/report").reply(() => {
      attempts += 1;
      return attempts === 1 ? [401] : [200, { ok: true }];
    });
    mock.onPost("/api/auth/refresh").reply(200, SESSION_BODY);

    const response = await client.get("/api/report");

    expect(response.data).toEqual({ ok: true });
    expect(attempts).toBe(2);
    expect(isAuthenticated.value).toBe(true);
  });

  it("only refreshes once for concurrent failures", async () => {
    let refreshes = 0;
    let reportAttempts = 0;
    mock.onGet("/api/one").reply(() => (reportAttempts++ < 1 ? [401] : [200, {}]));
    mock.onGet("/api/two").reply(() => [200, {}]);
    mock.onPost("/api/auth/refresh").reply(() => {
      refreshes += 1;
      return [200, SESSION_BODY];
    });

    await Promise.all([client.get("/api/one").catch(() => {}), client.get("/api/one").catch(() => {})]);

    expect(refreshes).toBe(1);
  });

  it("does not retry twice for the same request", async () => {
    let attempts = 0;
    mock.onGet("/api/report").reply(() => {
      attempts += 1;
      return [401];
    });
    mock.onPost("/api/auth/refresh").reply(200, SESSION_BODY);

    await expect(client.get("/api/report")).rejects.toBeDefined();
    expect(attempts).toBe(2);
  });

  it("signs the user out and redirects to login when the refresh fails", async () => {
    mock.onGet("/api/report").reply(401);
    mock.onPost("/api/auth/refresh").reply(401);

    await expect(client.get("/api/report")).rejects.toBeDefined();

    expect(isAuthenticated.value).toBe(false);
    expect(navigation.assign).toHaveBeenCalledWith("/api/auth/login?next=%2Fhere");
  });

  it("ignores a 401 from the auth routes themselves", async () => {
    let refreshes = 0;
    mock.onPost("/api/auth/refresh").reply(() => {
      refreshes += 1;
      return [401];
    });

    await expect(client.post("/api/auth/refresh")).rejects.toBeDefined();

    expect(refreshes).toBe(1);
  });

  it("ignores statuses other than 401", async () => {
    mock.onGet("/api/report").reply(500);
    mock.onPost("/api/auth/refresh").reply(200, SESSION_BODY);

    await expect(client.get("/api/report")).rejects.toBeDefined();
    expect(isAuthenticated.value).toBe(false);
  });

  it("installs only once per instance", () => {
    const before = client.interceptors.response.handlers.length;

    installOn(client);

    expect(client.interceptors.response.handlers.length).toBe(before);
  });

  it("recognises only same origin api urls that are not auth routes", () => {
    expect(isProtectedApiUrl({ url: "/api/report" })).toBe(true);
    expect(isProtectedApiUrl({ url: "/api/report", baseURL: "/" })).toBe(true);
    expect(isProtectedApiUrl({ url: "report", baseURL: "/api/" })).toBe(true);
    expect(isProtectedApiUrl({ url: `${window.location.origin}/api/report` })).toBe(true);

    expect(isProtectedApiUrl({ url: "/api/auth/session" })).toBe(false);
    expect(isProtectedApiUrl({ url: "/api/auth/refresh" })).toBe(false);
    expect(isProtectedApiUrl({ url: "/health" })).toBe(false);
    expect(isProtectedApiUrl({ url: "https://evil.example.org/api/report" })).toBe(false);
    expect(isProtectedApiUrl({})).toBe(false);
  });
});
