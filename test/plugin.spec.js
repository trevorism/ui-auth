import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigation } from "../src/navigation.js";
import { TrevorismAuth, bootstrap, createAuthGuard, ensureBootstrapped } from "../src/plugin.js";
import { clearScheduledRefresh, setClient } from "../src/refresh.js";
import { applySession, isAuthenticated } from "../src/store.js";
import { login, logout } from "../src/redirect.js";
import { useAuth } from "../src/useAuth.js";

const SESSION_BODY = {
  authenticated: true,
  username: "tester",
  role: "tenant_admin",
  permissions: "CRE",
  tenant: "tenant-a",
  admin: true,
  expiresAt: new Date(Date.now() + 900000).toISOString(),
};

describe("plugin", () => {
  let client;
  let mock;

  beforeEach(() => {
    client = axios.create();
    mock = new MockAdapter(client);
    setClient(client);
  });

  afterEach(() => {
    clearScheduledRefresh();
    mock.restore();
    setClient(axios);
  });

  it("populates the store from the session endpoint", async () => {
    mock.onGet("/api/auth/session").reply(200, SESSION_BODY);

    await bootstrap(client);

    const { user, isAdmin } = useAuth();
    expect(isAuthenticated.value).toBe(true);
    expect(user.value.username).toBe("tester");
    expect(isAdmin.value).toBe(true);
  });

  it("leaves the user signed out when the session endpoint fails", async () => {
    mock.onGet("/api/auth/session").reply(500);

    await bootstrap(client);

    expect(isAuthenticated.value).toBe(false);
  });

  it("resolves ready once the first session fetch settles", async () => {
    mock.onGet("/api/auth/session").reply(200, SESSION_BODY);

    await bootstrap(client);

    await expect(useAuth().ready).resolves.toBeUndefined();
  });

  it("registers a router guard only when a router is passed", () => {
    mock.onGet("/api/auth/session").reply(200, SESSION_BODY);
    const router = { beforeEach: vi.fn() };
    const app = { config: { globalProperties: {} } };

    TrevorismAuth.install(app, { router, axios: client });

    expect(router.beforeEach).toHaveBeenCalledTimes(1);
    expect(app.config.globalProperties.$auth).toBeDefined();
  });

  it("does not require a router", () => {
    mock.onGet("/api/auth/session").reply(200, SESSION_BODY);
    const app = { config: { globalProperties: {} } };

    expect(() => TrevorismAuth.install(app, { axios: client })).not.toThrow();
  });

  it("lets unguarded routes through", async () => {
    const guard = createAuthGuard();

    await expect(guard({ fullPath: "/public" })).resolves.toBe(true);
  });

  it("lets a signed in user through a guarded route", async () => {
    mock.onGet("/api/auth/session").reply(200, SESSION_BODY);
    await ensureBootstrapped(client);
    const guard = createAuthGuard();

    await expect(guard({ fullPath: "/report", meta: { requiresAuth: true } })).resolves.toBe(true);
  });

  it("sends a signed out user to login with the requested route", async () => {
    mock.onGet("/api/auth/session").reply(200, { authenticated: false });
    await ensureBootstrapped(client);
    const guard = createAuthGuard();

    await expect(guard({ fullPath: "/report?tab=1", meta: { requiresAuth: true } })).resolves.toBe(false);
    expect(navigation.assign).toHaveBeenCalledWith("/api/auth/login?next=%2Freport%3Ftab%3D1");
  });

  it("bootstraps against the given client when the guard runs before install", async () => {
    mock.onGet("/api/auth/session").reply(200, SESSION_BODY);
    const guard = createAuthGuard(client);

    await expect(guard({ fullPath: "/report", meta: { requiresAuth: true } })).resolves.toBe(true);
    expect(isAuthenticated.value).toBe(true);
    expect(navigation.assign).not.toHaveBeenCalled();
  });

  it("bootstraps a standalone guard against the global client by default", async () => {
    const globalMock = new MockAdapter(axios);
    globalMock.onGet("/api/auth/session").reply(200, SESSION_BODY);
    const guard = createAuthGuard();

    await expect(guard({ fullPath: "/report", meta: { requiresAuth: true } })).resolves.toBe(true);

    globalMock.restore();
  });

  it("redirects a guarded route at most once per page load", async () => {
    mock.onGet("/api/auth/session").reply(200, { authenticated: false });
    await ensureBootstrapped(client);
    const guard = createAuthGuard();

    await guard({ fullPath: "/a", meta: { requiresAuth: true } });
    await guard({ fullPath: "/b", meta: { requiresAuth: true } });

    expect(navigation.assign).toHaveBeenCalledTimes(1);
  });
});

describe("login and logout", () => {
  let mock;

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  it("sends the current path as next by default", () => {
    login();

    expect(navigation.assign).toHaveBeenCalledWith("/api/auth/login?next=%2Fhere");
  });

  it("encodes an explicit next", () => {
    login("/report?tab=1&sort=desc");

    expect(navigation.assign).toHaveBeenCalledWith("/api/auth/login?next=%2Freport%3Ftab%3D1%26sort%3Ddesc");
  });

  it("clears the session and follows the logout url", async () => {
    applySession(SESSION_BODY);
    mock.onPost("/api/auth/logout").reply(200, { logoutUrl: "https://login.auth.trevorism.com/api/logout" });

    await logout();

    expect(isAuthenticated.value).toBe(false);
    expect(navigation.assign).toHaveBeenCalledWith("https://login.auth.trevorism.com/api/logout");
  });

  it("still signs the user out when the logout call fails", async () => {
    applySession(SESSION_BODY);
    mock.onPost("/api/auth/logout").reply(500);

    await logout();

    expect(isAuthenticated.value).toBe(false);
    expect(navigation.assign).toHaveBeenCalledWith("/");
  });
});
