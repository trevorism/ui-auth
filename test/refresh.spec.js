import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MINIMUM_DELAY_MILLIS,
  clearScheduledRefresh,
  onVisibilityChange,
  refreshSession,
  scheduleRefresh,
  setClient,
} from "../src/refresh.js";
import { applySession, isAuthenticated } from "../src/store.js";

function sessionExpiringIn(seconds) {
  return {
    authenticated: true,
    username: "tester",
    role: "user",
    admin: false,
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}

function setHidden(hidden) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
}

describe("refresh", () => {
  let client;
  let mock;

  beforeEach(() => {
    vi.useFakeTimers();
    client = axios.create();
    mock = new MockAdapter(client);
    setClient(client);
    setHidden(false);
  });

  afterEach(() => {
    clearScheduledRefresh();
    vi.useRealTimers();
    mock.restore();
    setClient(axios);
  });

  it("applies the refreshed session", async () => {
    mock.onPost("/api/auth/refresh").reply(200, sessionExpiringIn(900));

    await refreshSession();

    expect(isAuthenticated.value).toBe(true);
  });

  it("signs the user out when the refresh fails", async () => {
    applySession(sessionExpiringIn(900));
    mock.onPost("/api/auth/refresh").reply(401);

    await expect(refreshSession()).rejects.toBeDefined();

    expect(isAuthenticated.value).toBe(false);
  });

  it("shares one in flight refresh between concurrent callers", async () => {
    let calls = 0;
    mock.onPost("/api/auth/refresh").reply(() => {
      calls += 1;
      return [200, sessionExpiringIn(900)];
    });

    await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(calls).toBe(1);
  });

  it("starts a new refresh after the previous one settles", async () => {
    let calls = 0;
    mock.onPost("/api/auth/refresh").reply(() => {
      calls += 1;
      return [200, sessionExpiringIn(900)];
    });

    await refreshSession();
    await refreshSession();

    expect(calls).toBe(2);
  });

  it("schedules the refresh a minute before expiry", async () => {
    applySession(sessionExpiringIn(900));
    let calls = 0;
    mock.onPost("/api/auth/refresh").reply(() => {
      calls += 1;
      return [200, sessionExpiringIn(900)];
    });

    scheduleRefresh();
    await vi.advanceTimersByTimeAsync(839 * 1000);
    expect(calls).toBe(0);

    await vi.advanceTimersByTimeAsync(2 * 1000);
    expect(calls).toBe(1);
  });

  it("never schedules a refresh sooner than the floor", async () => {
    applySession(sessionExpiringIn(1));
    let calls = 0;
    mock.onPost("/api/auth/refresh").reply(() => {
      calls += 1;
      return [200, sessionExpiringIn(900)];
    });

    scheduleRefresh();
    await vi.advanceTimersByTimeAsync(MINIMUM_DELAY_MILLIS - 1000);
    expect(calls).toBe(0);

    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toBe(1);
  });

  it("does not schedule anything without a session", () => {
    scheduleRefresh();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule anything while the tab is hidden", () => {
    applySession(sessionExpiringIn(900));
    setHidden(true);

    scheduleRefresh();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels the pending refresh when the tab is hidden", () => {
    applySession(sessionExpiringIn(900));
    scheduleRefresh();
    expect(vi.getTimerCount()).toBe(1);

    setHidden(true);
    onVisibilityChange();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("refreshes immediately when a hidden tab comes back overdue", async () => {
    applySession(sessionExpiringIn(30));
    let calls = 0;
    mock.onPost("/api/auth/refresh").reply(() => {
      calls += 1;
      return [200, sessionExpiringIn(900)];
    });

    onVisibilityChange();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toBe(1);
  });

  it("reschedules when a tab comes back with time to spare", () => {
    applySession(sessionExpiringIn(900));

    onVisibilityChange();

    expect(vi.getTimerCount()).toBe(1);
  });
});
