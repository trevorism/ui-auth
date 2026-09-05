import { describe, expect, it } from "vitest";
import { applySession, clearSession, isAdmin, isAuthenticated, loading, session, user } from "../src/store.js";

const AUTHENTICATED = {
  authenticated: true,
  username: "tester",
  role: "user",
  permissions: "CRE",
  tenant: "tenant-a",
  admin: false,
  expiresAt: "2026-09-05T12:00:00Z",
};

describe("store", () => {
  it("starts unauthenticated and loading", () => {
    expect(isAuthenticated.value).toBe(false);
    expect(user.value).toBeNull();
    expect(isAdmin.value).toBe(false);
  });

  it("exposes the signed in user", () => {
    applySession(AUTHENTICATED);

    expect(isAuthenticated.value).toBe(true);
    expect(loading.value).toBe(false);
    expect(user.value).toEqual({
      username: "tester",
      role: "user",
      permissions: "CRE",
      tenant: "tenant-a",
      admin: false,
    });
    expect(session.expiresAt).toBe("2026-09-05T12:00:00Z");
  });

  it("flags administrators", () => {
    applySession({ ...AUTHENTICATED, admin: true });

    expect(isAdmin.value).toBe(true);
  });

  it("never flags an unauthenticated response as admin", () => {
    applySession({ authenticated: false, admin: true });

    expect(isAdmin.value).toBe(false);
    expect(user.value).toBeNull();
  });

  it("treats an unauthenticated body as signed out", () => {
    applySession(AUTHENTICATED);

    applySession({ authenticated: false });

    expect(isAuthenticated.value).toBe(false);
    expect(user.value).toBeNull();
  });

  it("treats a missing body as signed out", () => {
    applySession(AUTHENTICATED);

    applySession(null);

    expect(isAuthenticated.value).toBe(false);
  });

  it("clears back to the empty session", () => {
    applySession(AUTHENTICATED);

    clearSession();

    expect(isAuthenticated.value).toBe(false);
    expect(session.username).toBeNull();
    expect(session.expiresAt).toBeNull();
    expect(loading.value).toBe(false);
  });

  it("does not allow callers to mutate the exposed session", () => {
    applySession(AUTHENTICATED);

    session.username = "someone else";

    expect(session.username).toBe("tester");
  });
});
